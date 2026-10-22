import re
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from app.models.runbook import Runbook, RunbookStep


class SearchService:
    @staticmethod
    def search_runbooks(
        db: Session,
        query: Optional[str] = None,
        ticket_type: Optional[str] = None,
        category: Optional[str] = None,
        product_area: Optional[str] = None,
        component: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Runbook], int, Dict[str, List[str]]]:
        """
        Searches runbooks by term across titles, components, commands, instructions, notes, and warnings.
        Applies faceted filtering.
        Returns: (runbook_items, total_count, facets)
        """
        base_query = db.query(Runbook)

        # Faceted filters
        if ticket_type and ticket_type != "All":
            base_query = base_query.filter(Runbook.ticket_type == ticket_type)
        if category and category != "All":
            base_query = base_query.filter(Runbook.category == category)
        if product_area and product_area != "All":
            base_query = base_query.filter(Runbook.product_area == product_area)
        if component and component != "All":
            base_query = base_query.filter(Runbook.components.ilike(f"%{component}%"))

        # Keyword Search
        if query and query.strip():
            clean_q = query.strip()
            # Split search terms for comprehensive token matching
            tokens = [t for t in re.split(r"\s+", clean_q) if len(t) > 1]
            if not tokens:
                tokens = [clean_q]

            # Match in Runbook metadata or child RunbookStep content
            runbook_matches = []
            for token in tokens:
                pattern = f"%{token}%"
                runbook_matches.append(or_(
                    Runbook.title.ilike(pattern),
                    Runbook.components.ilike(pattern),
                    Runbook.product_area.ilike(pattern),
                    Runbook.category.ilike(pattern),
                    Runbook.description.ilike(pattern)
                ))

            # Match in steps
            step_matches = []
            for token in tokens:
                pattern = f"%{token}%"
                step_matches.append(or_(
                    RunbookStep.command.ilike(pattern),
                    RunbookStep.instruction.ilike(pattern),
                    RunbookStep.warning.ilike(pattern),
                    RunbookStep.notes.ilike(pattern),
                    RunbookStep.step_title.ilike(pattern)
                ))

            matching_step_runbook_ids = db.query(RunbookStep.runbook_id).filter(
                and_(*step_matches) if len(step_matches) > 1 else step_matches[0]
            ).distinct().scalar_subquery()

            base_query = base_query.filter(
                or_(
                    and_(*runbook_matches) if len(runbook_matches) > 1 else runbook_matches[0],
                    Runbook.id.in_(matching_step_runbook_ids)
                )
            )

        total = base_query.count()
        runbooks = base_query.order_by(Runbook.title.asc()).offset(skip).limit(limit).all()

        # Compute facet options across all runbooks
        categories = [
            c[0] for c in db.query(Runbook.category).filter(Runbook.category.isnot(None), Runbook.category != "").distinct().all()
        ]
        product_areas = [
            p[0] for p in db.query(Runbook.product_area).filter(Runbook.product_area.isnot(None), Runbook.product_area != "").distinct().all()
        ]
        ticket_types = [
            t[0] for t in db.query(Runbook.ticket_type).filter(Runbook.ticket_type.isnot(None), Runbook.ticket_type != "").distinct().all()
        ]

        facets = {
            "categories": sorted(categories),
            "product_areas": sorted(product_areas),
            "ticket_types": sorted(ticket_types)
        }

        return runbooks, total, facets
