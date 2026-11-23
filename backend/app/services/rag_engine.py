import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
import httpx
from app.config import settings
from app.models.runbook import Runbook, RunbookStep
from app.schemas.chat import ChatSourceItem, CommandItem, TroubleshootingStep, ChatMessageResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the ATI Motors Robotics Runbook Assistant, an expert AI robotics systems engineer and troubleshooting pair-programmer for robotics operations interns, field technicians, and support engineers at ATI Motors.

ATI MOTORS ROBOTICS DOMAIN CONTEXT:
ATI Motors designs and manufactures industrial Autonomous Mobile Robots (AMRs) including:
- Sherpa, Tug, Mule, XT bots (e.g. XT-01, XT-04), PM, and Monofork.
- On-board compute runs Dockerized services including the primary 'mule' container (managed via `docker restart mule`, `mulectl`, and logged at `run/mule.log`).
- Telemetry & visual diagnostics run via Streamlit visualizer on port 8501 (`tracker.csv` for CTE/v/w, `low_level_control.csv` for encoders, `motor_can_debug.py` for XT bots hub motor reference/actuals).
- Hardware sub-systems: Lidar obstacle detection (192.168.1.100), Delfino motor control board, sidekick board (ultrasound & battery), EPO/aux battery, PS4 wireless controllers, and network interfaces (`nmtui`, `wifiscan.tar.gz`).

CRITICAL OPERATIONAL RULES:
1. STRICT ZERO-HALLUCINATION POLICY: You are grounded EXCLUSIVELY in the provided verified Runbook documentation from the ATI Motors database.
2. NEVER invent unverified ROS 2 topics, Linux commands, command-line flags, Docker tags, robot identifiers (e.g. XT bot numbers), or electrical pinouts.
3. PRESERVE COMMANDS EXACTLY: Any command text from the documentation must be preserved character-for-character, including flags, parameters (such as --posegraph_opt, --zmin, --zmax), and environment variables.
4. HIGHLIGHT OPERATIONAL SAFETY: Always surface warnings (e.g., emergency stops, optical hazards, wheel pinch points, high voltage) with utmost priority.
5. TICKET TROUBLESHOOTING READINESS: Operations engineers use this tool to resolve active Zendesk support tickets. Provide direct, numbered, step-by-step resolution that can be immediately executed on the robot or pasted into the ticket.
6. IF INFORMATION IS MISSING OR INSUFFICIENT: State clearly that no documented runbook covers the exact request in the current database. Never fabricate an operational procedure.
7. CLARIFY AMBIGUITY: If multiple runbooks could match (e.g., Streamlit Obstacle Detection vs Streamlit Heat Map), point out both and ask a clarifying question.
8. SEPARATE INSTRUCTIONS FROM EXPLANATIONS: Provide clean numbered steps with clear instructions, exact commands, warnings, and notes.

OUTPUT FORMAT:
You MUST respond with valid JSON matching this schema:
{
  "content": "Detailed markdown explanation of the procedure, grounded strictly in the documentation.",
  "confidence": 0.95,
  "steps": [
    {
      "step_number": 1,
      "step_title": "Short title",
      "instruction": "Detailed instruction checklist",
      "command": "Exact command or null",
      "warning": "Safety warning or null",
      "notes": "Documentation note/tip or null",
      "runbook_title": "Source Runbook Name"
    }
  ],
  "commands": [
    {
      "step_number": 1,
      "title": "Short title",
      "command": "Exact terminal command",
      "instruction": "Purpose of command"
    }
  ],
  "warnings": ["Warning text 1"],
  "suggested_followups": ["Follow up question 1?", "Follow up question 2?"],
  "insufficient_data": false
}
"""


class RAGEngine:
    @staticmethod
    def build_context_block(runbooks: List[Runbook]) -> str:
        """Serializes candidate runbooks into structured text for LLM prompt context."""
        if not runbooks:
            return "No matching runbooks found in the database for this query."

        lines = ["=== OFFICIAL DOCUMENTED RUNBOOKS ==="]
        for rb in runbooks:
            lines.append(f"\n--- RUNBOOK: {rb.title} ---")
            lines.append(f"Category: {rb.category or 'N/A'}")
            lines.append(f"Product Area: {rb.product_area or 'N/A'}")
            lines.append(f"Components: {rb.components or 'N/A'}")
            lines.append(f"Ticket Type: {rb.ticket_type or 'N/A'}")
            if rb.description:
                lines.append(f"Overview: {rb.description}")
            if rb.source_url:
                lines.append(f"Source URL: {rb.source_url}")

            lines.append("STEPS:")
            for s in rb.steps:
                lines.append(f"  [Step {s.step_number}] {s.step_title or 'Procedure'}")
                if s.instruction:
                    lines.append(f"    Instruction: {s.instruction}")
                if s.command:
                    lines.append(f"    Command: {s.command}")
                if s.warning:
                    lines.append(f"    Warning: {s.warning}")
                if s.notes:
                    lines.append(f"    Notes: {s.notes}")
        return "\n".join(lines)

    @staticmethod
    async def call_gemini(
        query: str,
        context_block: str,
        history: List[Dict[str, str]],
        api_key: str,
        model: str = "gemini-1.5-flash"
    ) -> Dict[str, Any]:
        """Calls Google Gemini Free Tier REST API with structured JSON output."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        chat_history_parts = []
        for h in history[-4:]:
            chat_history_parts.append(f"{h['role'].upper()}: {h['content']}")

        history_str = "\n".join(chat_history_parts) if chat_history_parts else "None"

        user_prompt = (
            f"{context_block}\n\n"
            f"=== CONVERSATION HISTORY ===\n{history_str}\n\n"
            f"=== CURRENT USER QUESTION ===\n{query}\n\n"
            f"Respond with grounded JSON strictly following the instructions."
        )

        payload = {
            "contents": [
                {
                    "parts": [{"text": user_prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Gemini API returned error {res.status_code}: {res.text}")
            data = res.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(raw_text)

    @staticmethod
    async def call_groq(
        query: str,
        context_block: str,
        history: List[Dict[str, str]],
        api_key: str,
        model: str = "llama-3.3-70b-versatile"
    ) -> Dict[str, Any]:
        """Calls Groq Free Tier API (Llama 3.3 70B / Llama 3.1 8B)."""
        url = "https://api.groq.com/openai/v1/chat/completions"

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in history[-4:]:
            messages.append({"role": h["role"], "content": h["content"]})

        user_content = f"{context_block}\n\nUSER QUESTION: {query}"
        messages.append({"role": "user", "content": user_content})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            if res.status_code != 200:
                raise ValueError(f"Groq API error {res.status_code}: {res.text}")
            data = res.json()
            raw_text = data["choices"][0]["message"]["content"]
            return json.loads(raw_text)

    @staticmethod
    async def call_ollama(
        query: str,
        context_block: str,
        history: List[Dict[str, str]],
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2"
    ) -> Dict[str, Any]:
        """Calls local offline Ollama model."""
        url = f"{base_url.rstrip('/')}/api/chat"

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in history[-4:]:
            messages.append({"role": h["role"], "content": h["content"]})

        messages.append({"role": "user", "content": f"{context_block}\n\nUSER QUESTION: {query}"})

        payload = {
            "model": model,
            "messages": messages,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1}
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, json=payload)
            if res.status_code != 200:
                raise ValueError(f"Ollama error {res.status_code}: {res.text}")
            data = res.json()
            raw_text = data["message"]["content"]
            return json.loads(raw_text)

    @classmethod
    def call_local_grounded_engine(
        cls,
        query: str,
        runbooks: List[Runbook],
        confidence: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        High-precision local deterministic RAG synthesizer.
        Works 100% free with NO API keys, NO external dependencies, and zero latency.
        Strictly enforces the zero-hallucination mandate while providing rich,
        actionable troubleshooting guidance for robotics operations interns.
        """
        calc_confidence = confidence if confidence is not None else (0.94 if runbooks else 0.0)

        if not runbooks or calc_confidence == 0.0:
            return {
                "content": (
                    f"### No Documented Runbook Found\n\n"
                    f"No verified operational runbook was found in the ATI database matching **\"{query}\"**.\n\n"
                    f"> ℹ️ **Operational Guidance:** Check whether this issue falls under another subsystem (e.g. `Streamlit`, `Lidar`, `Mule`, `Delfino`, `Battery`, `Network`, `Wheel Calibration`).\n\n"
                    f"> **Strict Safety Policy:** The assistant is restricted from inventing undocumented terminal commands, robot IDs, or procedures."
                ),
                "confidence": 0.0,
                "steps": [],
                "commands": [],
                "warnings": [],
                "suggested_followups": [
                    "How do I calibrate wheels without delfino?",
                    "How do I inspect the Lidar frame for a detected obstacle?",
                    "How to troubleshoot high CTE on control module?",
                    "What command is documented for map generation?"
                ],
                "insufficient_data": True
            }

        top_rb = runbooks[0]
        other_matches = runbooks[1:3]

        structured_steps = []
        commands_list = []
        warnings_list = []

        # 1. Primary Runbook Steps
        for step in top_rb.steps:
            structured_steps.append({
                "step_number": step.step_number,
                "step_title": step.step_title,
                "instruction": step.instruction,
                "command": step.command,
                "warning": step.warning,
                "notes": step.notes,
                "runbook_title": top_rb.title
            })
            if step.command:
                commands_list.append({
                    "step_number": step.step_number,
                    "title": step.step_title or f"Step {step.step_number} Command",
                    "command": step.command,
                    "instruction": step.instruction
                })
            if step.warning:
                warnings_list.append(f"{top_rb.title} Step {step.step_number}: {step.warning}")

        md_lines = [
            f"### Operational Troubleshooting Guide: {top_rb.title}",
            "",
            f"**Subsystem:** `{top_rb.category or 'General'}` | **Area:** `{top_rb.product_area or 'AMR'}` | **Components:** `{top_rb.components or 'Core'}`",
            ""
        ]

        if top_rb.description:
            md_lines.append(f"{top_rb.description}\n")

        # High priority safety warning banner if warnings exist
        if warnings_list:
            md_lines.append("> ⚠️ **CRITICAL OPERATIONAL SAFETY WARNINGS:**")
            for w in warnings_list:
                md_lines.append(f"> - {w}")
            md_lines.append("")

        md_lines.append("#### Step-by-Step Procedure:")
        for s in structured_steps:
            title_text = f"**Step {s['step_number']}: {s['step_title']}**" if s['step_title'] else f"**Step {s['step_number']}**"
            md_lines.append(title_text)
            if s['instruction']:
                md_lines.append(f"{s['instruction']}\n")
            if s['command']:
                md_lines.append(f"```bash\n{s['command']}\n```\n")
            if s['warning']:
                md_lines.append(f"> ⚠️ **Warning:** {s['warning']}\n")
            if s['notes']:
                md_lines.append(f"> ℹ️ **Notes:** {s['notes']}\n")

        # 2. Check if secondary match is deeply relevant
        if other_matches:
            md_lines.append("---")
            md_lines.append("#### Related Troubleshooting Runbooks in ATI Knowledge Base:")
            for other in other_matches:
                md_lines.append(f"- **{other.title}** (`{other.product_area or 'AMR'}` / `{other.components or 'Subsystem'}`): {len(other.steps)} documented step(s)")

        followups = []
        if other_matches:
            for other in other_matches:
                followups.append(f"Tell me about {other.title}")
        if top_rb.components:
            followups.append(f"What commands are documented for {top_rb.components.split(',')[0]}?")
        followups.append("How do I verify the resolution on the robot?")

        return {
            "content": "\n".join(md_lines),
            "confidence": round(calc_confidence, 2),
            "steps": structured_steps,
            "commands": commands_list,
            "warnings": warnings_list,
            "suggested_followups": followups[:4],
            "insufficient_data": False
        }
