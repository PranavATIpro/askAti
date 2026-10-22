from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ChatMessageRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    ticket_context: Optional[dict] = None  # For Zendesk ticket context


class ChatSourceItem(BaseModel):
    runbook_id: str
    runbook_title: str
    category: Optional[str] = None
    product_area: Optional[str] = None
    components: Optional[str] = None
    step_numbers: List[int] = []
    source_url: Optional[str] = None


class CommandItem(BaseModel):
    step_number: int
    title: Optional[str] = None
    command: str
    instruction: Optional[str] = None


class TroubleshootingStep(BaseModel):
    step_number: int
    step_title: Optional[str] = None
    instruction: Optional[str] = None
    command: Optional[str] = None
    warning: Optional[str] = None
    notes: Optional[str] = None
    runbook_title: str


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    role: str = "assistant"
    content: str
    retrieval_mode: str = "structured_grounded"
    confidence: float
    sources: List[ChatSourceItem] = []
    steps: List[TroubleshootingStep] = []
    commands: List[CommandItem] = []
    warnings: List[str] = []
    suggested_followups: List[str] = []
    created_at: datetime


class MessageItemResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources: Optional[str] = None
    commands: Optional[str] = None
    warnings: Optional[str] = None
    suggested_followups: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageItemResponse] = []
