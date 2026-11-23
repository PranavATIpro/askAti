import re
import json
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.models.runbook import Runbook, RunbookStep
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    ChatMessageResponse, ChatSourceItem, CommandItem, TroubleshootingStep
)
from app.services.rag_engine import RAGEngine

logger = logging.getLogger(__name__)


class AssistantService:
    # Notice: 'can', 'run', 'check' are preserved because they are crucial technical keywords in robotics
    STOP_WORDS = {
        "how", "do", "i", "to", "the", "a", "an", "is", "for", "in", "on", "what",
        "which", "when", "where", "why", "who", "with", "from", "at", "by", "of", "and", "or",
        "please", "help", "me", "tell", "about", "give", "procedure", "steps", "guide"
    }

    ROBOTICS_SYNONYMS = {
        "mule": ["mule", "mule.log", "mulectl", "container"],
        "amr": ["amr", "bot", "robot", "xt", "tug", "monofork", "pm", "sherpa"],
        "bot": ["amr", "bot", "robot", "xt", "sherpa"],
        "bots": ["amr", "bot", "robot", "xt", "sherpa"],
        "cte": ["cross track error", "cte", "tracker.csv", "high cte", "control_module"],
        "cross": ["cross track error", "cte", "high cte"],
        "lidar": ["lidar", "laser", "frame id", "obstacle", "drivable"],
        "obstacle": ["obstacle", "ghost obstacle", "lidar", "streamlit", "drivable"],
        "obstacles": ["obstacle", "ghost obstacle", "lidar", "streamlit"],
        "visualizer": ["visualizer", "streamlit", "8501", "run_visualizer", "fuser"],
        "streamlit": ["streamlit", "visualizer", "8501", "tracker.csv", "heatmap", "plot"],
        "plots": ["plot", "plots", "tracker.csv", "low_level_control.csv", "motor_can_debug"],
        "wifi": ["wifi", "wifiscript", "wifiscan", "network", "nmtui", "10.9.20.33"],
        "wifiscript": ["wifiscript", "wifiscan", "tar.gz", "wifi"],
        "network": ["network", "wifi", "ping", "nmtui", "connection", "disconnected"],
        "encoder": ["encoder", "stalling", "runaway monitor", "low_level_control"],
        "motor": ["motor", "hub motor", "pid tuning", "powerboard", "motor_can_debug", "current"],
        "can": ["can", "can sidekick", "motor_can_debug", "sidekick board"],
        "sidekick": ["can sidekick", "sidekick board", "ultrasound"],
        "delfino": ["delfino", "flashing the delfino", "wheel calibration", "delfino board", "delfino died"],
        "ssh": ["ssh", "add ssh key", "get ssh key", "authorized_keys", "ati@"],
        "slicing": ["data slicing", "slice", "rosbag", "slicing"],
        "battery": ["battery", "led", "tricolor", "epo", "emergency", "aux battery"],
        "sound": ["sound", "speaker", "generic error (sound)"],
        "ps4": ["ps4", "controller", "blinking red", "stale_ode"],
        "calibration": ["calibration", "calibrate", "wheel calibration", "sensor calibration"],
        "stalling": ["encoder stalling", "stalling", "runaway monitor"],
        "ghost": ["ghost obstacle", "obstacle detected", "lidar"],
    }

    @classmethod
    def extract_keywords(cls, query: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s\-\_]", " ", query.lower())
        tokens = [w.strip() for w in cleaned.split() if w.strip()]
        meaningful = [w for w in tokens if w not in cls.STOP_WORDS and len(w) > 1]
        
        # Expand with robotics domain synonyms
        expanded = set(meaningful)
        for t in meaningful:
            if t in cls.ROBOTICS_SYNONYMS:
                expanded.update(cls.ROBOTICS_SYNONYMS[t])
        
        return list(expanded) if expanded else tokens

    @classmethod
    def score_runbook_match(cls, runbook: Runbook, keywords: List[str], raw_query: str) -> float:
        score = 0.0
        q_lower = raw_query.lower()
        title_lower = runbook.title.lower()
        comp_lower = (runbook.components or "").lower()
        area_lower = (runbook.product_area or "").lower()
        cat_lower = (runbook.category or "").lower()

        # 1. Exact phrase / title matches (highest precision)
        if title_lower in q_lower or q_lower in title_lower:
            score += 80.0
        
        # Normalize parentheses: e.g. "High CTE (control_module)" matching "high cte" or "control module"
        clean_title = re.sub(r"[\(\)\-_]", " ", title_lower)
        for part in clean_title.split():
            if len(part) > 3 and part in q_lower:
                score += 25.0

        # 2. Components matching
        if runbook.components:
            for c in runbook.components.split(","):
                c_clean = c.strip().lower()
                if c_clean and (c_clean in q_lower or q_lower in c_clean):
                    score += 50.0

        # 3. Product area and Category matching
        if runbook.product_area and (area_lower in q_lower or q_lower in area_lower):
            score += 30.0
        if runbook.category and (cat_lower in q_lower or q_lower in cat_lower):
            score += 20.0

        # Aggregate step content once to avoid length bias
        step_content_tokens = set()
        step_full_text = ""
        for step in runbook.steps:
            st = f"{step.step_title or ''} {step.command or ''} {step.instruction or ''} {step.warning or ''} {step.notes or ''}".lower()
            step_full_text += " " + st
            step_content_tokens.update(re.findall(r"[\w\.\-]+", st))

        # Check for technical phrases across step text
        if "motor_can_debug" in q_lower or "motor can debug" in q_lower:
            if "motor_can_debug" in step_full_text:
                score += 70.0
        if "wheel_calibration_manual" in q_lower and "wheel_calibration_manual" in step_full_text:
            score += 70.0
        if "wifiscan" in q_lower and "wifiscan" in step_full_text:
            score += 70.0
        if "delfino" in q_lower and "delfino" in title_lower:
            score += 50.0
        if "ghost" in q_lower and "ghost" in title_lower:
            score += 60.0

        # 4. Keyword and synonym hits (counted once per runbook)
        matched_kw_count = 0
        for kw in keywords:
            kw_clean = kw.lower()
            matched = False
            if kw_clean in title_lower:
                score += 25.0
                matched = True
            elif comp_lower and kw_clean in comp_lower:
                score += 20.0
                matched = True
            elif area_lower and kw_clean in area_lower:
                score += 15.0
                matched = True
            elif cat_lower and kw_clean in cat_lower:
                score += 10.0
                matched = True
            elif kw_clean in step_content_tokens or kw_clean in step_full_text:
                score += 12.0
                matched = True
            
            if matched:
                matched_kw_count += 1

        # Bonus for matching multiple keywords simultaneously
        if matched_kw_count >= 3:
            score += 30.0
        elif matched_kw_count >= 2:
            score += 15.0

        return score

    @classmethod
    def get_active_provider_info(cls) -> Dict[str, Any]:
        """Returns details about the configured LLM engine."""
        if settings.GEMINI_API_KEY:
            return {
                "provider": "gemini",
                "model": settings.GEMINI_MODEL,
                "label": f"Google {settings.GEMINI_MODEL} (Free Tier)",
                "description": "Fast multi-modal reasoning with free tier."
            }
        elif settings.GROQ_API_KEY:
            return {
                "provider": "groq",
                "model": settings.GROQ_MODEL,
                "label": f"Groq {settings.GROQ_MODEL} (Free Tier)",
                "description": "Ultra-low latency open-weights model on LPUs."
            }
        elif settings.LLM_PROVIDER == "ollama":
            return {
                "provider": "ollama",
                "model": settings.OLLAMA_MODEL,
                "label": f"Ollama {settings.OLLAMA_MODEL} (Local / Offline)",
                "description": "100% private on-premise model running locally."
            }
        else:
            return {
                "provider": "local_grounded",
                "model": "rule-grounded-synthesizer",
                "label": "Local Grounded Engine (Free / Built-in)",
                "description": "Deterministic, zero-latency grounded RAG engine with zero external dependencies."
            }

    @classmethod
    async def generate_response_async(
        cls,
        db: Session,
        query: str,
        conversation_id: Optional[str] = None,
        ticket_context: Optional[dict] = None
    ) -> ChatMessageResponse:
        """
        Executes grounded RAG retrieval and synthesis with conversational memory.
        """
        # Ensure conversation exists
        if not conversation_id:
            conv = Conversation(title=query[:60] if len(query) > 60 else query)
            db.add(conv)
            db.flush()
            conversation_id = conv.id
        else:
            conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conv:
                conv = Conversation(id=conversation_id, title=query[:60])
                db.add(conv)
                db.flush()

        # Load recent message history for multi-turn dialogue context
        recent_messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.desc()).limit(6).all()
        recent_messages.reverse()

        history_for_llm = [
            {"role": m.role, "content": m.content}
            for m in recent_messages
        ]

        # Save user message
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=query
        )
        db.add(user_msg)
        db.flush()

        # Extract search keywords and enrich with ticket context if present
        combined_search_text = query
        if ticket_context:
            subj = ticket_context.get("subject", "")
            tags = " ".join(ticket_context.get("tags", []))
            combined_search_text = f"{query} {subj} {tags}".strip()

        keywords = cls.extract_keywords(combined_search_text)
        all_runbooks = db.query(Runbook).all()

        scored_runbooks: List[Tuple[Runbook, float]] = []
        for rb in all_runbooks:
            score = cls.score_runbook_match(rb, keywords, combined_search_text)
            if score > 0:
                scored_runbooks.append((rb, score))

        scored_runbooks.sort(key=lambda x: x[1], reverse=True)
        top_score = scored_runbooks[0][1] if scored_runbooks else 0.0

        candidate_runbooks = [rb for rb, score in scored_runbooks[:4] if score > 5.0]

        # Dynamically compute match confidence based on retrieval scoring against live runbooks & steps
        if not candidate_runbooks or top_score < 10.0:
            match_confidence = 0.0
        elif top_score >= 80.0:
            match_confidence = min(0.99, 0.90 + (top_score - 80.0) * 0.0008)
        elif top_score >= 50.0:
            match_confidence = 0.80 + ((top_score - 50.0) / 30.0) * 0.10
        elif top_score >= 25.0:
            match_confidence = 0.65 + ((top_score - 25.0) / 25.0) * 0.14
        else:
            match_confidence = 0.40 + ((top_score - 10.0) / 15.0) * 0.24

        match_confidence = round(match_confidence, 2)

        # If zero candidate runbooks found via direct query, check if conversation history
        # referenced a specific runbook previously (pronoun / follow-up resolution)
        if not candidate_runbooks and recent_messages:
            for past_m in reversed(recent_messages):
                if past_m.sources:
                    try:
                        past_sources = json.loads(past_m.sources)
                        if past_sources:
                            prev_rb_id = past_sources[0].get("runbook_id")
                            prev_rb = db.query(Runbook).filter(Runbook.id == prev_rb_id).first()
                            if prev_rb:
                                candidate_runbooks = [prev_rb]
                                match_confidence = 0.75
                                break
                    except Exception:
                        pass

        context_block = RAGEngine.build_context_block(candidate_runbooks)
        provider_info = cls.get_active_provider_info()
        provider = provider_info["provider"]

        llm_output: Dict[str, Any] = {}

        # Attempt call to configured LLM with automatic graceful fallback
        if provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                llm_output = await RAGEngine.call_gemini(
                    query=query,
                    context_block=context_block,
                    history=history_for_llm,
                    api_key=settings.GEMINI_API_KEY,
                    model=settings.GEMINI_MODEL
                )
            except Exception as e:
                logger.warning(f"Gemini API call failed ({e}), falling back to local grounded engine.")
                llm_output = RAGEngine.call_local_grounded_engine(query, candidate_runbooks, confidence=match_confidence)
        elif provider == "groq" and settings.GROQ_API_KEY:
            try:
                llm_output = await RAGEngine.call_groq(
                    query=query,
                    context_block=context_block,
                    history=history_for_llm,
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL
                )
            except Exception as e:
                logger.warning(f"Groq API call failed ({e}), falling back to local grounded engine.")
                llm_output = RAGEngine.call_local_grounded_engine(query, candidate_runbooks, confidence=match_confidence)
        elif provider == "ollama":
            try:
                llm_output = await RAGEngine.call_ollama(
                    query=query,
                    context_block=context_block,
                    history=history_for_llm,
                    base_url=settings.OLLAMA_BASE_URL,
                    model=settings.OLLAMA_MODEL
                )
            except Exception as e:
                logger.warning(f"Ollama call failed ({e}), falling back to local grounded engine.")
                llm_output = RAGEngine.call_local_grounded_engine(query, candidate_runbooks, confidence=match_confidence)
        else:
            llm_output = RAGEngine.call_local_grounded_engine(query, candidate_runbooks, confidence=match_confidence)

        # Build structured objects
        content_text = llm_output.get("content", "Procedure retrieved.")
        confidence = match_confidence
        steps_raw = llm_output.get("steps", [])
        commands_raw = llm_output.get("commands", [])
        warnings_raw = llm_output.get("warnings", [])
        followups_raw = llm_output.get("suggested_followups", [])

        # Build ChatSourceItems from candidate runbooks
        sources_list: List[ChatSourceItem] = []
        for rb in candidate_runbooks:
            sources_list.append(ChatSourceItem(
                runbook_id=rb.id,
                runbook_title=rb.title,
                category=rb.category,
                product_area=rb.product_area,
                components=rb.components,
                step_numbers=[s.step_number for s in rb.steps],
                source_url=rb.source_url
            ))

        structured_steps = [
            TroubleshootingStep(
                step_number=int(s.get("step_number") or idx + 1),
                step_title=s.get("step_title"),
                instruction=s.get("instruction"),
                command=s.get("command"),
                warning=s.get("warning"),
                notes=s.get("notes"),
                runbook_title=s.get("runbook_title") or (candidate_runbooks[0].title if candidate_runbooks else "Runbook")
            )
            for idx, s in enumerate(steps_raw)
        ]

        commands_list = [
            CommandItem(
                step_number=int(c.get("step_number") or idx + 1),
                title=c.get("title"),
                command=c.get("command", ""),
                instruction=c.get("instruction")
            )
            for idx, c in enumerate(commands_raw)
            if c.get("command")
        ]

        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=content_text,
            sources=json.dumps([s.model_dump() for s in sources_list]),
            commands=json.dumps([c.model_dump() for c in commands_list]),
            warnings=json.dumps(warnings_raw),
            suggested_followups=json.dumps(followups_raw[:4])
        )
        db.add(assistant_msg)
        db.commit()

        return ChatMessageResponse(
            conversation_id=conversation_id,
            message_id=assistant_msg.id,
            role="assistant",
            content=content_text,
            retrieval_mode=f"{provider}_grounded_rag",
            confidence=round(confidence, 2),
            sources=sources_list,
            steps=structured_steps,
            commands=commands_list,
            warnings=warnings_raw,
            suggested_followups=followups_raw[:4],
            created_at=assistant_msg.created_at or datetime.utcnow()
        )

    @classmethod
    def generate_response(
        cls,
        db: Session,
        query: str,
        conversation_id: Optional[str] = None,
        ticket_context: Optional[dict] = None
    ) -> ChatMessageResponse:
        """Synchronous wrapper for FastAPI router execution."""
        return asyncio.run(cls.generate_response_async(
            db=db,
            query=query,
            conversation_id=conversation_id,
            ticket_context=ticket_context
        ))
