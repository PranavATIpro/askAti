from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.runbook import Runbook, RunbookStep
from app.schemas.runbook import (
    RunbookResponse, RunbookDetailResponse, RunbookListResponse,
    RunbookCreate, RunbookUpdate, RunbookStepResponse
)
from app.services.search_service import SearchService
from app.services.ingestion_service import compute_runbook_hash, IngestionService

router = APIRouter(tags=["Runbooks"])


@router.get("/runbooks", response_model=RunbookListResponse)
def list_runbooks(
    q: Optional[str] = Query(None, description="Search keyword in title, steps, or commands"),
    ticket_type: Optional[str] = Query(None, description="Filter by ticket type"),
    category: Optional[str] = Query(None, description="Filter by category"),
    product_area: Optional[str] = Query(None, description="Filter by product area"),
    component: Optional[str] = Query(None, description="Filter by component"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve runbooks with faceted filters and search."""
    items, total, facets = SearchService.search_runbooks(
        db=db,
        query=q,
        ticket_type=ticket_type,
        category=category,
        product_area=product_area,
        component=component,
        skip=skip,
        limit=limit
    )

    response_items = []
    for rb in items:
        resp = RunbookResponse(
            id=rb.id,
            title=rb.title,
            description=rb.description,
            form_type=rb.form_type,
            ticket_type=rb.ticket_type,
            category=rb.category,
            product_area=rb.product_area,
            components=rb.components,
            source_type=rb.source_type,
            source_page_id=rb.source_page_id,
            source_url=rb.source_url,
            content_hash=rb.content_hash,
            source_updated_at=rb.source_updated_at,
            created_at=rb.created_at,
            updated_at=rb.updated_at,
            steps_count=len(rb.steps)
        )
        response_items.append(resp)

    return RunbookListResponse(
        total=total,
        items=response_items,
        categories=facets["categories"],
        product_areas=facets["product_areas"],
        ticket_types=facets["ticket_types"]
    )


@router.get("/runbooks/{runbook_id}", response_model=RunbookDetailResponse)
def get_runbook_detail(runbook_id: str, db: Session = Depends(get_db)):
    """Retrieve individual runbook by ID with all ordered troubleshooting steps."""
    rb = db.query(Runbook).filter(Runbook.id == runbook_id).first()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")

    return RunbookDetailResponse(
        id=rb.id,
        title=rb.title,
        description=rb.description,
        form_type=rb.form_type,
        ticket_type=rb.ticket_type,
        category=rb.category,
        product_area=rb.product_area,
        components=rb.components,
        source_type=rb.source_type,
        source_page_id=rb.source_page_id,
        source_url=rb.source_url,
        content_hash=rb.content_hash,
        source_updated_at=rb.source_updated_at,
        created_at=rb.created_at,
        updated_at=rb.updated_at,
        steps_count=len(rb.steps),
        steps=[s for s in rb.steps]
    )


@router.get("/search", response_model=RunbookListResponse)
def quick_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Direct search endpoint for quick auto-complete or lookup."""
    items, total, facets = SearchService.search_runbooks(
        db=db,
        query=q,
        skip=skip,
        limit=limit
    )

    response_items = []
    for rb in items:
        response_items.append(RunbookResponse(
            id=rb.id,
            title=rb.title,
            description=rb.description,
            form_type=rb.form_type,
            ticket_type=rb.ticket_type,
            category=rb.category,
            product_area=rb.product_area,
            components=rb.components,
            source_type=rb.source_type,
            source_page_id=rb.source_page_id,
            source_url=rb.source_url,
            content_hash=rb.content_hash,
            source_updated_at=rb.source_updated_at,
            created_at=rb.created_at,
            updated_at=rb.updated_at,
            steps_count=len(rb.steps)
        ))

    return RunbookListResponse(
        total=total,
        items=response_items,
        categories=facets["categories"],
        product_areas=facets["product_areas"],
        ticket_types=facets["ticket_types"]
    )


@router.post("/runbooks", response_model=RunbookDetailResponse)
def create_runbook(payload: RunbookCreate, db: Session = Depends(get_db)):
    """Manually creates a new operational runbook with ordered steps."""
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Runbook title is required")

    steps_data = [s.model_dump() for s in payload.steps]
    meta = {
        "form_type": payload.form_type,
        "ticket_type": payload.ticket_type,
        "category": payload.category,
        "product_area": payload.product_area,
        "components": payload.components,
        "source_url": payload.source_url
    }
    content_hash = compute_runbook_hash(payload.title, meta, steps_data)

    new_rb = Runbook(
        title=payload.title.strip(),
        description=payload.description,
        form_type=payload.form_type,
        ticket_type=payload.ticket_type,
        category=payload.category,
        product_area=payload.product_area,
        components=payload.components,
        source_type="manual_entry",
        source_url=payload.source_url,
        content_hash=content_hash
    )
    db.add(new_rb)
    db.flush()

    for idx, s in enumerate(payload.steps, start=1):
        step = RunbookStep(
            runbook_id=new_rb.id,
            step_number=s.step_number or idx,
            step_title=s.step_title,
            command=s.command,
            instruction=s.instruction,
            warning=s.warning,
            notes=s.notes
        )
        db.add(step)

    db.commit()
    db.refresh(new_rb)

    return RunbookDetailResponse(
        id=new_rb.id,
        title=new_rb.title,
        description=new_rb.description,
        form_type=new_rb.form_type,
        ticket_type=new_rb.ticket_type,
        category=new_rb.category,
        product_area=new_rb.product_area,
        components=new_rb.components,
        source_type=new_rb.source_type,
        source_page_id=new_rb.source_page_id,
        source_url=new_rb.source_url,
        content_hash=new_rb.content_hash,
        source_updated_at=new_rb.source_updated_at,
        created_at=new_rb.created_at,
        updated_at=new_rb.updated_at,
        steps_count=len(new_rb.steps),
        steps=[s for s in new_rb.steps]
    )


@router.put("/runbooks/{runbook_id}", response_model=RunbookDetailResponse)
def update_runbook(
    runbook_id: str,
    payload: RunbookUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates an existing runbook and replaces/updates its steps cleanly.
    Recalculates deterministic SHA256 content hash.
    """
    rb = db.query(Runbook).filter(Runbook.id == runbook_id).first()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")

    if payload.title is not None:
        rb.title = payload.title.strip()
    if payload.description is not None:
        rb.description = payload.description
    if payload.form_type is not None:
        rb.form_type = payload.form_type
    if payload.ticket_type is not None:
        rb.ticket_type = payload.ticket_type
    if payload.category is not None:
        rb.category = payload.category
    if payload.product_area is not None:
        rb.product_area = payload.product_area
    if payload.components is not None:
        rb.components = payload.components
    if payload.source_url is not None:
        rb.source_url = payload.source_url

    # If steps are provided, replace them with updated sequence
    if payload.steps is not None:
        db.query(RunbookStep).filter(RunbookStep.runbook_id == rb.id).delete()
        for idx, s in enumerate(payload.steps, start=1):
            step = RunbookStep(
                runbook_id=rb.id,
                step_number=s.step_number or idx,
                step_title=s.step_title,
                command=s.command,
                instruction=s.instruction,
                warning=s.warning,
                notes=s.notes
            )
            db.add(step)

    db.flush()

    # Recalculate content hash
    all_steps_data = [
        {
            "step_number": s.step_number,
            "step_title": s.step_title,
            "command": s.command,
            "instruction": s.instruction,
            "warning": s.warning,
            "notes": s.notes
        }
        for s in rb.steps
    ]
    meta = {
        "form_type": rb.form_type,
        "ticket_type": rb.ticket_type,
        "category": rb.category,
        "product_area": rb.product_area,
        "components": rb.components,
        "source_url": rb.source_url
    }
    rb.content_hash = compute_runbook_hash(rb.title, meta, all_steps_data)
    rb.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(rb)

    return RunbookDetailResponse(
        id=rb.id,
        title=rb.title,
        description=rb.description,
        form_type=rb.form_type,
        ticket_type=rb.ticket_type,
        category=rb.category,
        product_area=rb.product_area,
        components=rb.components,
        source_type=rb.source_type,
        source_page_id=rb.source_page_id,
        source_url=rb.source_url,
        content_hash=rb.content_hash,
        source_updated_at=rb.source_updated_at,
        created_at=rb.created_at,
        updated_at=rb.updated_at,
        steps_count=len(rb.steps),
        steps=[s for s in rb.steps]
    )


@router.delete("/runbooks/{runbook_id}")
def delete_runbook(runbook_id: str, db: Session = Depends(get_db)):
    """Deletes an operational runbook and all associated steps."""
    rb = db.query(Runbook).filter(Runbook.id == runbook_id).first()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")

    db.query(RunbookStep).filter(RunbookStep.runbook_id == rb.id).delete()
    db.delete(rb)
    db.commit()
    return {"success": True, "message": f"Runbook '{rb.title}' deleted successfully"}


@router.post("/runbooks/sync-notion")
async def sync_notion_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Directly imports/syncs an updated Notion CSV export into the knowledge base.
    Idempotent: updates existing runbooks, adds new ones, skips unmodified ones.
    """
    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig", errors="replace")

    res = IngestionService.commit_import(
        db=db,
        content=content,
        file_type="csv",
        filename=file.filename or "Notion_Export.csv"
    )

    total_count = db.query(Runbook).count()
    return {
        "success": True,
        "message": f"Notion sync complete: {res.records_created} created, {res.records_updated} updated, {res.records_skipped} unchanged.",
        "records_created": res.records_created,
        "records_updated": res.records_updated,
        "records_skipped": res.records_skipped,
        "total_runbooks": total_count
    }
