from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class IngestionPreviewRow(BaseModel):
    row_index: int
    runbook_title: str
    step_number: Optional[int] = None
    step_title: Optional[str] = None
    command_preview: Optional[str] = None
    instruction_preview: Optional[str] = None
    category: Optional[str] = None
    product_area: Optional[str] = None
    components: Optional[str] = None
    status: str  # "valid", "warning", "skipped"
    message: Optional[str] = None


class IngestionPreviewSummary(BaseModel):
    total_rows_parsed: int
    valid_rows: int
    skipped_rows: int
    runbooks_identified: int
    validation_issues: List[str] = []


class IngestionPreviewResponse(BaseModel):
    success: bool
    summary: IngestionPreviewSummary
    sample_rows: List[IngestionPreviewRow]
    runbook_titles: List[str]


class IngestionCommitResponse(BaseModel):
    job_id: str
    source_type: str
    status: str
    records_processed: int
    records_created: int
    records_updated: int
    records_skipped: int
    error_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class IngestionJobResponse(BaseModel):
    id: str
    source_type: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    records_processed: int
    records_created: int
    records_updated: int
    records_skipped: int
    error_summary: Optional[str] = None
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IngestionJobListResponse(BaseModel):
    total: int
    jobs: List[IngestionJobResponse]
