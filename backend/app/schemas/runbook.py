from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class RunbookStepBase(BaseModel):
    step_number: int = 1
    step_title: Optional[str] = None
    command: Optional[str] = None
    instruction: Optional[str] = None
    warning: Optional[str] = None
    notes: Optional[str] = None


class RunbookStepCreate(RunbookStepBase):
    pass


class RunbookStepResponse(RunbookStepBase):
    id: str
    runbook_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RunbookBase(BaseModel):
    title: str
    description: Optional[str] = None
    form_type: Optional[str] = None
    ticket_type: Optional[str] = None
    category: Optional[str] = None
    product_area: Optional[str] = None
    components: Optional[str] = None
    source_type: str = "notion_csv"
    source_page_id: Optional[str] = None
    source_url: Optional[str] = None


class RunbookCreate(RunbookBase):
    steps: List[RunbookStepCreate] = []


class RunbookResponse(RunbookBase):
    id: str
    content_hash: Optional[str] = None
    source_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    steps_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class RunbookDetailResponse(RunbookResponse):
    steps: List[RunbookStepResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RunbookListResponse(BaseModel):
    total: int
    items: List[RunbookResponse]
    categories: List[str] = []
    product_areas: List[str] = []
    ticket_types: List[str] = []
