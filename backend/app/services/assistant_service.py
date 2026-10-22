import re
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.runbook import Runbook, RunbookStep
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    ChatMessageResponse, ChatSourceItem, CommandItem, TroubleshootingStep
)


class AssistantService:
    STOP_WORDS = {
        "how", "do", "i", "can", "to", "the", "a", "an", "is", "for", "in", "on", "what",
        "which", "when", "where", "why", "who", "with", "from", "at", "by", "of", "and", "or",
        "please", "help", "me", "investigate", "check", "run", "cover", "covers"
    }

    @classmethod
    def extract_keywords(cls, query: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s\-\_]", " ", query.lower())
        tokens = [w.strip() for w in cleaned.split() if w.strip()]
        meaningful = [w for w in tokens if w not in cls.STOP_WORDS and len(w) > 2]
        return meaningful if meaningful else tokens

    @classmethod
    def score_runbook_match(cls, runbook: Runbook, keywords: List[str], raw_query: str) -> float:
        """Calculates relevance score based on exact title, component, command, and instruction hits."""
        score = 0.0
        q_lower = raw_query.lower()

        # Exact title substring match
        if runbook.title.lower() in q_lower or q_lower in runbook.title.lower():
            score += 40.0

        # Component exact match
        if runbook.components and any(c.strip().lower() in q_lower for c in runbook.components.split(",")):
            score += 30.0

        # Product area exact match
        if runbook.product_area and runbook.product_area.lower() in q_lower:
            score += 20.0

        # Keyword hits in title and components
        for kw in keywords:
            if kw in runbook.title.lower():
                score += 15.0
            if runbook.components and kw in runbook.components.lower():
                score += 12.0
            if runbook.product_area and kw in runbook.product_area.lower():
                score += 8.0
            if runbook.category and kw in runbook.category.lower():
                score += 5.0

        # Keyword hits in steps
        for step in runbook.steps:
            if step.command:
                cmd_lower = step.command.lower()
                for kw in keywords:
                    if kw in cmd_lower:
                        score += 10.0
                if "docker" in q_lower and "docker" in cmd_lower:
                    score += 15.0
            if step.instruction:
                inst_lower = step.instruction.lower()
                for kw in keywords:
                    if kw in inst_lower:
                        score += 4.0
            if step.step_title:
                st_lower = step.step_title.lower()
                for kw in keywords:
                    if kw in st_lower:
                        score += 6.0

        return score

    @classmethod
    def generate_response(
        cls,
        db: Session,
        query: str,
        conversation_id: Optional[str] = None,
        ticket_context: Optional[dict] = None
    ) -> ChatMessageResponse:
        """
        Executes strict retrieval against PostgreSQL runbooks and formats a structured response.
        Persists message to conversation history.
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

        # Save user message
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=query
        )
        db.add(user_msg)
        db.flush()

        keywords = cls.extract_keywords(query)
        all_runbooks = db.query(Runbook).all()

        scored_runbooks: List[Tuple[Runbook, float]] = []
        for rb in all_runbooks:
            score = cls.score_runbook_match(rb, keywords, query)
            if score > 0:
                scored_runbooks.append((rb, score))

        scored_runbooks.sort(key=lambda x: x[1], reverse=True)

        # Handle zero matches
        if not scored_runbooks or scored_runbooks[0][1] < 5.0:
            content = (
                f"### No Documented Runbook Found\n\n"
                f"No verified operational procedure was found matching your query: **\"{query}\"**.\n\n"
                f"> **Grounded Retrieval Notice:** The assistant is strictly restricted from inventing "
                f"undocumented terminal commands, flags, or procedures.\n\n"
                f"**Suggested Next Steps:**\n"
                f"- Check the **Runbook Browser** in the sidebar to review available documentation.\n"
                f"- Ensure relevant Notion runbooks have been exported and imported via the **Admin Ingestion** tab.\n"
                f"- Try searching by component name (e.g. `Lidar`, `Camera`, `Wheel Calibration`, `Streamlit`, `Battery`)."
            )

            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=content,
                sources=json.dumps([]),
                commands=json.dumps([]),
                warnings=json.dumps([]),
                suggested_followups=json.dumps([
                    "How do I generate a map?",
                    "How can I investigate an obstacle detection issue?",
                    "Which runbook covers the Streamlit visualizer?"
                ])
            )
            db.add(assistant_msg)
            db.commit()

            return ChatMessageResponse(
                conversation_id=conversation_id,
                message_id=assistant_msg.id,
                role="assistant",
                content=content,
                retrieval_mode="structured_grounded",
                confidence=0.0,
                sources=[],
                steps=[],
                commands=[],
                warnings=[],
                suggested_followups=[
                    "How do I generate a map?",
                    "How can I investigate an obstacle detection issue?",
                    "Which runbook covers the Streamlit visualizer?"
                ],
                created_at=assistant_msg.created_at or datetime.utcnow()
            )

        top_runbook, top_score = scored_runbooks[0]
        runner_ups = [rb for rb, score in scored_runbooks[1:4] if score > 15.0]

        # Extract structured steps, commands, warnings, and notes
        structured_steps: List[TroubleshootingStep] = []
        commands_list: List[CommandItem] = []
        warnings_list: List[str] = []
        sources_list: List[ChatSourceItem] = []

        step_numbers = []
        for step in top_runbook.steps:
            step_numbers.append(step.step_number)
            structured_steps.append(TroubleshootingStep(
                step_number=step.step_number,
                step_title=step.step_title,
                instruction=step.instruction,
                command=step.command,
                warning=step.warning,
                notes=step.notes,
                runbook_title=top_runbook.title
            ))
            if step.command:
                commands_list.append(CommandItem(
                    step_number=step.step_number,
                    title=step.step_title,
                    command=step.command,
                    instruction=step.instruction
                ))
            if step.warning:
                warnings_list.append(f"Step {step.step_number} ({top_runbook.title}): {step.warning}")

        sources_list.append(ChatSourceItem(
            runbook_id=top_runbook.id,
            runbook_title=top_runbook.title,
            category=top_runbook.category,
            product_area=top_runbook.product_area,
            components=top_runbook.components,
            step_numbers=step_numbers,
            source_url=top_runbook.source_url
        ))

        # Format markdown explanation
        md_lines = [
            f"### Documented Procedure: {top_runbook.title}",
            "",
            f"**Category:** `{top_runbook.category or 'N/A'}` | **Product Area:** `{top_runbook.product_area or 'N/A'}` | **Components:** `{top_runbook.components or 'N/A'}`",
            ""
        ]

        if top_runbook.description:
            md_lines.append(f"{top_runbook.description}\n")

        for s in structured_steps:
            title_text = f"**Step {s.step_number}: {s.step_title}**" if s.step_title else f"**Step {s.step_number}**"
            md_lines.append(title_text)
            if s.instruction:
                md_lines.append(f"{s.instruction}\n")
            if s.command:
                md_lines.append(f"```bash\n{s.command}\n```\n")
            if s.warning:
                md_lines.append(f"> ⚠️ **Warning:** {s.warning}\n")
            if s.notes:
                md_lines.append(f"> ℹ️ **Notes:** {s.notes}\n")

        # Clarifying questions if several runbooks matched closely
        followups = []
        if runner_ups:
            md_lines.append("---")
            md_lines.append("#### Related or Alternative Runbooks:")
            for other_rb in runner_ups:
                md_lines.append(f"- **{other_rb.title}** (`{other_rb.product_area or 'General'}` / `{other_rb.components or 'N/A'}`)")
                followups.append(f"Tell me about {other_rb.title}")
        else:
            followups.append("Show all steps for this runbook")
            if top_runbook.components:
                followups.append(f"What other runbooks exist for {top_runbook.components.split(',')[0]}?")

        full_content = "\n".join(md_lines)

        # Save assistant message
        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_content,
            sources=json.dumps([s.model_dump() for s in sources_list]),
            commands=json.dumps([c.model_dump() for c in commands_list]),
            warnings=json.dumps(warnings_list),
            suggested_followups=json.dumps(followups[:4])
        )
        db.add(assistant_msg)
        db.commit()

        confidence = min(0.99, max(0.4, top_score / 100.0))

        return ChatMessageResponse(
            conversation_id=conversation_id,
            message_id=assistant_msg.id,
            role="assistant",
            content=full_content,
            retrieval_mode="structured_grounded",
            confidence=round(confidence, 2),
            sources=sources_list,
            steps=structured_steps,
            commands=commands_list,
            warnings=warnings_list,
            suggested_followups=followups[:4],
            created_at=assistant_msg.created_at or datetime.utcnow()
        )
