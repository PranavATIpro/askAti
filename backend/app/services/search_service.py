import re
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, case
from app.models.runbook import Runbook, RunbookStep


class SearchService:
    STOP_WORDS = {
        "how", "do", "i", "to", "the", "a", "an", "is", "for", "in", "on", "what",
        "which", "when", "where", "why", "who", "with", "from", "at", "by", "of",
        "and", "or", "please", "help", "me", "tell", "about", "give", "can", "check",
        "issue", "procedure", "steps", "guide", "investigate", "run"
    }

    @classmethod
    def search_runbooks(
        cls,
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
        Applies stopword filtering and faceted filtering with intelligent relevance ranking.
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

        clean_q = query.strip() if query else None

        # Keyword Search
        if clean_q:
            # Extract meaningful tokens (filter out stopwords)
            all_raw_tokens = [t for t in re.split(r"[^\w\-\.]+", clean_q.lower()) if len(t) > 1]
            meaningful_tokens = [t for t in all_raw_tokens if t not in cls.STOP_WORDS]
            tokens = meaningful_tokens if meaningful_tokens else (all_raw_tokens if all_raw_tokens else [clean_q])

            # Exact phrase match condition for title/components
            clean_q_pattern = f"%{clean_q}%"
            exact_phrase_match = or_(
                Runbook.title.ilike(clean_q_pattern),
                Runbook.components.ilike(clean_q_pattern),
                Runbook.product_area.ilike(clean_q_pattern),
                Runbook.description.ilike(clean_q_pattern)
            )

            # Token match across Runbook metadata
            runbook_token_matches = []
            for token in tokens:
                pattern = f"%{token}%"
                runbook_token_matches.append(or_(
                    Runbook.title.ilike(pattern),
                    Runbook.components.ilike(pattern),
                    Runbook.product_area.ilike(pattern),
                    Runbook.category.ilike(pattern),
                    Runbook.description.ilike(pattern)
                ))

            # Token match across Runbook steps (command, instruction, warning, notes, title)
            step_token_matches = []
            for token in tokens:
                pattern = f"%{token}%"
                step_token_matches.append(or_(
                    RunbookStep.command.ilike(pattern),
                    RunbookStep.instruction.ilike(pattern),
                    RunbookStep.warning.ilike(pattern),
                    RunbookStep.notes.ilike(pattern),
                    RunbookStep.step_title.ilike(pattern)
                ))

            # Match any of the meaningful tokens in steps
            matching_step_runbook_ids = db.query(RunbookStep.runbook_id).filter(
                or_(*step_token_matches)
            ).distinct().scalar_subquery()

            base_query = base_query.filter(
                or_(
                    exact_phrase_match,
                    or_(*runbook_token_matches),
                    Runbook.id.in_(matching_step_runbook_ids)
                )
            )

            # Relevance ranking: exact title match first, then component match, then others
            base_query = base_query.order_by(
                case(
                    (Runbook.title.ilike(clean_q_pattern), 1),
                    (Runbook.components.ilike(clean_q_pattern), 2),
                    else_=3
                ),
                Runbook.title.asc()
            )
        else:
            base_query = base_query.order_by(Runbook.title.asc())

        total = base_query.count()
        runbooks = base_query.offset(skip).limit(limit).all()

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
