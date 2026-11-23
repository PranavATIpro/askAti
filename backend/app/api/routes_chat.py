from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.chat import Conversation, Message
from app.schemas.chat import (
    ChatMessageRequest, ChatMessageResponse, ConversationResponse,
    ConversationDetailResponse, MessageItemResponse
)
from app.services.assistant_service import AssistantService

router = APIRouter(tags=["Assistant & Chat"])


class LLMSettingsUpdateRequest(BaseModel):
    provider: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None


@router.get("/assistant/providers")
def get_llm_providers():
    """Returns active LLM provider details and available model options."""
    active = AssistantService.get_active_provider_info()
    return {
        "active": active,
        "available_options": [
            {
                "id": "local_grounded",
                "name": "Local Grounded Engine",
                "tier": "Free / Built-in",
                "requires_key": False,
                "description": "Deterministic zero-latency RAG engine. 100% private, runs with zero configuration."
            },
            {
                "id": "gemini",
                "name": "Google Gemini 1.5 / 2.0 Flash",
                "tier": "Free Tier (Google AI Studio)",
                "requires_key": True,
                "description": "Recommended free model. 1M token context, sub-2s responses, zero-hallucination compliance."
            },
            {
                "id": "groq",
                "name": "Groq Llama 3.3 70B",
                "tier": "Free Tier (Groq Cloud)",
                "requires_key": True,
                "description": "Sub-second inference speed on custom LPU silicon."
            },
            {
                "id": "ollama",
                "name": "Ollama Local Model",
                "tier": "Free / Offline",
                "requires_key": False,
                "description": "Local offline LLM (Llama 3.2, Mistral, Qwen) for air-gapped robotics sites."
            }
        ]
    }


@router.post("/assistant/settings")
def update_llm_settings(payload: LLMSettingsUpdateRequest):
    """Updates runtime LLM provider and credentials."""
    if payload.provider:
        settings.LLM_PROVIDER = payload.provider
    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip()
    if payload.gemini_model:
        settings.GEMINI_MODEL = payload.gemini_model.strip()
    if payload.groq_api_key is not None:
        settings.GROQ_API_KEY = payload.groq_api_key.strip()
    if payload.groq_model:
        settings.GROQ_MODEL = payload.groq_model.strip()
    if payload.ollama_base_url:
        settings.OLLAMA_BASE_URL = payload.ollama_base_url.strip()
    if payload.ollama_model:
        settings.OLLAMA_MODEL = payload.ollama_model.strip()

    return {
        "success": True,
        "active_provider": AssistantService.get_active_provider_info()
    }


@router.post("/assistant/chat", response_model=ChatMessageResponse)
def chat_with_assistant(
    request: ChatMessageRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a natural language troubleshooting question.
    Returns structured, grounded runbook steps, commands, and sources from PostgreSQL.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    return AssistantService.generate_response(
        db=db,
        query=request.query,
        conversation_id=request.conversation_id,
        ticket_context=request.ticket_context
    )


@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Retrieve recent troubleshooting conversations."""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()
    results = []
    for c in convs:
        results.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages)
        ))
    return results


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_details(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve conversation messages and history."""
    c = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_resp = []
    for m in c.messages:
        messages_resp.append(MessageItemResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            sources=m.sources,
            commands=m.commands,
            warnings=m.warnings,
            suggested_followups=m.suggested_followups,
            created_at=m.created_at
        ))

    return ConversationDetailResponse(
        id=c.id,
        title=c.title,
        created_at=c.created_at,
        updated_at=c.updated_at,
        message_count=len(c.messages),
        messages=messages_resp
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db)
):
    """Delete a conversation and associated messages."""
    c = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(c)
    db.commit()
    return {"success": True, "message": "Conversation deleted"}
