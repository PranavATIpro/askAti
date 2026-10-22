from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.runbook import Runbook
from app.schemas.runbook import (
    RunbookResponse, RunbookDetailResponse, RunbookListResponse
)
from app.services.search_service import SearchService

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
