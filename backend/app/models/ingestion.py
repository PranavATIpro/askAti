import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime
from sqlalchemy.sql import func
from app.database import Base


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_type = Column(String(50), nullable=False)  # csv, markdown, notion_api
    status = Column(String(50), nullable=False, default="pending")  # pending, processing, completed, failed
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    records_processed = Column(Integer, default=0, nullable=False)
    records_created = Column(Integer, default=0, nullable=False)
    records_updated = Column(Integer, default=0, nullable=False)
    records_skipped = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON formatted validation logs / skipped reasons
