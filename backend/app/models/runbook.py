import uuid
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Runbook(Base):
    __tablename__ = "runbooks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    form_type = Column(String(100), nullable=True)
    ticket_type = Column(String(100), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)
    product_area = Column(String(100), nullable=True, index=True)
    components = Column(String(255), nullable=True, index=True)
    source_type = Column(String(50), default="notion_csv", nullable=False)
    source_page_id = Column(String(100), nullable=True, index=True)
    source_url = Column(Text, nullable=True)
    source_updated_at = Column(DateTime(timezone=True), nullable=True)
    content_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    steps = relationship(
        "RunbookStep",
        back_populates="runbook",
        cascade="all, delete-orphan",
        order_by="RunbookStep.step_number"
    )

    __table_args__ = (
        Index("idx_runbook_title_components", "title", "components"),
    )


class RunbookStep(Base):
    __tablename__ = "runbook_steps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    runbook_id = Column(String(36), ForeignKey("runbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False, default=1)
    step_title = Column(String(255), nullable=True)
    command = Column(Text, nullable=True)
    instruction = Column(Text, nullable=True)
    warning = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    runbook = relationship("Runbook", back_populates="steps")

    __table_args__ = (
        Index("idx_step_runbook_order", "runbook_id", "step_number"),
    )
