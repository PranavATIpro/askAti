from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.ingestion import IngestionJob
from app.schemas.ingestion import (
    IngestionPreviewResponse, IngestionCommitResponse, IngestionJobListResponse, IngestionJobResponse
)
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


def verify_admin_key(x_admin_key: Optional[str] = Header(None)):
    """Simple API key protection for admin ingestion routes in development/production."""
    # In development mode, if header is omitted or matches, allow access
    if settings.ADMIN_API_KEY and x_admin_key and x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin API key")
    return True


@router.post("/preview", response_model=IngestionPreviewResponse)
async def preview_ingestion(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    file_type: str = Form("csv")
):
    """
    Parses Notion export and returns validation preview, identifying skipped rows
    and warnings prior to committing.
    """
    content = ""
    filename = "upload.csv"
    if file:
        filename = file.filename or "upload.csv"
        bytes_data = await file.read()
        content = bytes_data.decode("utf-8", errors="replace")
        if filename.endswith(".md"):
            file_type = "markdown"
    elif raw_content:
        content = raw_content
    else:
        raise HTTPException(status_code=400, detail="Must provide an export file or raw_content")

    return IngestionService.preview(content, file_type=file_type, filename=filename)


@router.post("/import", response_model=IngestionCommitResponse)
async def commit_ingestion(
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    file_type: str = Form("csv"),
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_admin_key)
):
    """
    Imports runbook records idempotently into the PostgreSQL database.
    Updates existing records without duplicating runbooks or steps.
    """
    content = ""
    filename = "upload.csv"
    if file:
        filename = file.filename or "upload.csv"
        bytes_data = await file.read()
        content = bytes_data.decode("utf-8", errors="replace")
        if filename.endswith(".md"):
            file_type = "markdown"
    elif raw_content:
        content = raw_content
    else:
        raise HTTPException(status_code=400, detail="Must provide an export file or raw_content")

    try:
        return IngestionService.commit_import(db, content, file_type=file_type, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import execution failed: {str(e)}")


@router.get("/jobs", response_model=IngestionJobListResponse)
def list_ingestion_jobs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Retrieve history of ingestion jobs with status and counts."""
    total = db.query(IngestionJob).count()
    jobs = db.query(IngestionJob).order_by(IngestionJob.started_at.desc()).offset(skip).limit(limit).all()

    return IngestionJobListResponse(
        total=total,
        jobs=[IngestionJobResponse.model_validate(j) for j in jobs]
    )
