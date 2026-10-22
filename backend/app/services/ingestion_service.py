import csv
import io
import re
import hashlib
import json
import logging
from datetime import datetime
from typing import Dict, List, Tuple, Any, Optional
from sqlalchemy.orm import Session
from app.models.runbook import Runbook, RunbookStep
from app.models.ingestion import IngestionJob
from app.schemas.ingestion import (
    IngestionPreviewResponse, IngestionPreviewSummary, IngestionPreviewRow, IngestionCommitResponse
)

logger = logging.getLogger(__name__)


def compute_runbook_hash(title: str, metadata: Dict[str, Any], steps: List[Dict[str, Any]]) -> str:
    """Calculates a deterministic SHA256 content hash of runbook title, metadata, and ordered steps."""
    hasher = hashlib.sha256()
    hasher.update(title.strip().encode("utf-8"))
    for k in sorted(metadata.keys()):
        val = str(metadata.get(k) or "").strip()
        hasher.update(f"{k}:{val}".encode("utf-8"))
    for step in sorted(steps, key=lambda s: int(s.get("step_number") or 1)):
        for prop in ["step_number", "step_title", "command", "instruction", "warning", "notes"]:
            val = str(step.get(prop) or "").strip()
            hasher.update(f"{prop}:{val}".encode("utf-8"))
    return hasher.hexdigest()


class IngestionService:
    @staticmethod
    def parse_csv(content: str) -> Tuple[List[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """
        Parses Notion CSV export.
        Returns:
            - grouped_runbooks: dict of parsed runbooks with their steps
            - validation_warnings: list of human-readable warnings
            - raw_row_preview: list of inspected rows with status
        """
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        if not rows:
            return [], ["Uploaded CSV is empty."], []

        # Notion headers often have trailing whitespace (e.g. 'Command ')
        raw_headers = rows[0]
        headers = [h.strip().replace("\ufeff", "") for h in raw_headers]
        
        # Build normalized column index mapping
        col_map = {}
        for idx, h in enumerate(headers):
            key = h.lower()
            if "runbook" in key or "title" in key and "step" not in key:
                col_map["runbook_name"] = idx
            elif "form" in key:
                col_map["form_type"] = idx
            elif "ticket" in key:
                col_map["ticket_type"] = idx
            elif "category" in key:
                col_map["category"] = idx
            elif "product" in key or "area" in key:
                col_map["product_area"] = idx
            elif "component" in key:
                col_map["components"] = idx
            elif "step number" in key or "step no" in key or key == "step":
                col_map["step_number"] = idx
            elif "step title" in key or "step name" in key:
                col_map["step_title"] = idx
            elif "command" in key:
                col_map["command"] = idx
            elif "instruction" in key or "procedure" in key:
                col_map["instruction"] = idx
            elif "warning" in key or "alert" in key:
                col_map["warning"] = idx
            elif "note" in key:
                col_map["notes"] = idx

        runbooks_dict: Dict[str, Dict[str, Any]] = {}
        validation_warnings: List[str] = []
        preview_rows: List[Dict[str, Any]] = []

        def get_val(row_arr: List[str], key_name: str) -> str:
            if key_name in col_map and col_map[key_name] < len(row_arr):
                return row_arr[col_map[key_name]].strip()
            return ""

        for row_idx, r in enumerate(rows[1:], start=2):
            if not any(cell.strip() for cell in r):
                # completely empty row
                preview_rows.append({
                    "row_index": row_idx,
                    "runbook_title": "",
                    "status": "skipped",
                    "message": "Empty row skipped."
                })
                continue

            runbook_name = get_val(r, "runbook_name")
            step_num_raw = get_val(r, "step_number")
            step_title = get_val(r, "step_title")
            command = get_val(r, "command")
            instruction = get_val(r, "instruction")
            warning = get_val(r, "warning")
            notes = get_val(r, "notes")
            category = get_val(r, "category")
            product_area = get_val(r, "product_area")
            components = get_val(r, "components")
            form_type = get_val(r, "form_type")
            ticket_type = get_val(r, "ticket_type")

            # Check if this is an orphan/select-option row without runbook title or executable content
            if not runbook_name:
                if not (command or instruction or notes):
                    preview_rows.append({
                        "row_index": row_idx,
                        "runbook_title": "",
                        "status": "skipped",
                        "message": "Notion select-option / template row without title or content skipped."
                    })
                    continue
                else:
                    validation_warnings.append(f"Row {row_idx}: Missing Runbook Name for step with instructions.")
                    preview_rows.append({
                        "row_index": row_idx,
                        "runbook_title": "UNKNOWN",
                        "status": "warning",
                        "message": "Missing Runbook Name."
                    })
                    continue

            # Parse or infer step number
            try:
                step_number = int(step_num_raw) if step_num_raw else None
            except ValueError:
                step_number = None

            if runbook_name not in runbooks_dict:
                runbooks_dict[runbook_name] = {
                    "title": runbook_name,
                    "form_type": form_type,
                    "ticket_type": ticket_type,
                    "category": category,
                    "product_area": product_area,
                    "components": components,
                    "source_type": "notion_csv",
                    "steps": []
                }

            # Update runbook metadata if previous row had empty fields
            rb = runbooks_dict[runbook_name]
            if form_type and not rb["form_type"]: rb["form_type"] = form_type
            if ticket_type and not rb["ticket_type"]: rb["ticket_type"] = ticket_type
            if category and not rb["category"]: rb["category"] = category
            if product_area and not rb["product_area"]: rb["product_area"] = product_area
            if components and not rb["components"]: rb["components"] = components

            # Infer step number if missing
            calculated_step_num = step_number if step_number is not None else (len(rb["steps"]) + 1)

            step_data = {
                "step_number": calculated_step_num,
                "step_title": step_title or f"Step {calculated_step_num}",
                "command": command or None,
                "instruction": instruction or None,
                "warning": warning or None,
                "notes": notes or None
            }
            rb["steps"].append(step_data)

            preview_rows.append({
                "row_index": row_idx,
                "runbook_title": runbook_name,
                "step_number": calculated_step_num,
                "step_title": step_title,
                "command_preview": command[:80] if command else None,
                "instruction_preview": instruction[:80] if instruction else None,
                "category": category,
                "product_area": product_area,
                "components": components,
                "status": "valid",
                "message": None
            })

        return list(runbooks_dict.values()), validation_warnings, preview_rows

    @staticmethod
    def parse_markdown(content: str, filename: str = "runbook.md") -> Tuple[List[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """
        Parses Notion Markdown export into structured runbook and ordered steps.
        """
        lines = content.splitlines()
        validation_warnings: List[str] = []
        preview_rows: List[Dict[str, Any]] = []

        title = ""
        form_type = None
        ticket_type = None
        category = None
        product_area = None
        components = None
        source_page_id = None
        source_url = None

        steps: List[Dict[str, Any]] = []
        current_step: Optional[Dict[str, Any]] = None
        in_code_block = False
        code_lines: List[str] = []

        for line_num, raw_line in enumerate(lines, start=1):
            line = raw_line.strip()

            # Top heading as Runbook Title
            if line.startswith("# ") and not title:
                title = line[2:].strip()
                continue

            # Notion metadata properties format: **Key:** Value
            meta_match = re.match(r"\*\*([^*]+)\*\*:\s*(.*)", line)
            if meta_match:
                k, v = meta_match.group(1).lower().strip(), meta_match.group(2).strip()
                if "form" in k: form_type = v
                elif "ticket" in k: ticket_type = v
                elif "category" in k: category = v
                elif "product" in k or "area" in k: product_area = v
                elif "component" in k: components = v
                elif "source page" in k or "page id" in k: source_page_id = v
                elif "source url" in k or "url" in k: source_url = v
                continue

            # Step heading: ## Step X: Title or ## X. Title or ## Title
            step_match = re.match(r"^##\s+(?:Step\s+)?(\d+)[\.\:]?\s*(.*)", line, re.IGNORECASE)
            if step_match:
                if current_step:
                    if code_lines:
                        current_step["command"] = "\n".join(code_lines).strip()
                        code_lines = []
                    steps.append(current_step)

                step_num = int(step_match.group(1))
                step_title = step_match.group(2).strip()
                current_step = {
                    "step_number": step_num,
                    "step_title": step_title or f"Step {step_num}",
                    "command": None,
                    "instruction": "",
                    "warning": None,
                    "notes": None
                }
                continue

            # Code fence handling
            if line.startswith("```"):
                if in_code_block:
                    in_code_block = False
                    if current_step:
                        current_step["command"] = "\n".join(code_lines).strip()
                        code_lines = []
                else:
                    in_code_block = True
                    code_lines = []
                continue

            if in_code_block:
                code_lines.append(raw_line)
                continue

            # Warning or Notes Callouts: > **Warning:** ... or > **Notes:** ...
            if line.startswith(">"):
                callout_text = line.lstrip(">").strip()
                warn_match = re.match(r"\*\*(?:Warning|Alert|Caution):?\*\*:?\s*(.*)", callout_text, re.IGNORECASE)
                if warn_match and current_step:
                    current_step["warning"] = (current_step["warning"] + " " if current_step["warning"] else "") + warn_match.group(1).strip()
                    continue
                notes_match = re.match(r"\*\*(?:Note|Notes|Tip):?\*\*:?\s*(.*)", callout_text, re.IGNORECASE)
                if notes_match and current_step:
                    current_step["notes"] = (current_step["notes"] + " " if current_step["notes"] else "") + notes_match.group(1).strip()
                    continue

            # General instructions for current step
            if current_step and line:
                if current_step["instruction"]:
                    current_step["instruction"] += "\n" + raw_line
                else:
                    current_step["instruction"] = raw_line

        # Commit final step
        if current_step:
            if code_lines:
                current_step["command"] = "\n".join(code_lines).strip()
            steps.append(current_step)

        if not title:
            # Fallback to filename
            title = filename.replace(".md", "").replace("_", " ").title()
            validation_warnings.append(f"Markdown title missing, inferred from filename: '{title}'")

        # If no explicit steps, treat entire content as single step 1
        if not steps and content.strip():
            steps.append({
                "step_number": 1,
                "step_title": title,
                "command": None,
                "instruction": content.strip(),
                "warning": None,
                "notes": None
            })

        for s in steps:
            preview_rows.append({
                "row_index": s["step_number"],
                "runbook_title": title,
                "step_number": s["step_number"],
                "step_title": s["step_title"],
                "command_preview": s["command"][:80] if s["command"] else None,
                "instruction_preview": s["instruction"][:80] if s["instruction"] else None,
                "category": category,
                "product_area": product_area,
                "components": components,
                "status": "valid",
                "message": None
            })

        runbook_obj = {
            "title": title,
            "form_type": form_type,
            "ticket_type": ticket_type,
            "category": category,
            "product_area": product_area,
            "components": components,
            "source_type": "notion_md",
            "source_page_id": source_page_id,
            "source_url": source_url,
            "steps": steps
        }
        return [runbook_obj], validation_warnings, preview_rows

    @classmethod
    def preview(cls, content: str, file_type: str = "csv", filename: str = "import") -> IngestionPreviewResponse:
        """Generates dry-run validation preview and summary without writing to DB."""
        if file_type.lower() == "csv":
            runbooks, warnings, preview_rows = cls.parse_csv(content)
        else:
            runbooks, warnings, preview_rows = cls.parse_markdown(content, filename)

        valid_rows = sum(1 for r in preview_rows if r["status"] == "valid")
        skipped_rows = sum(1 for r in preview_rows if r["status"] == "skipped")

        summary = IngestionPreviewSummary(
            total_rows_parsed=len(preview_rows),
            valid_rows=valid_rows,
            skipped_rows=skipped_rows,
            runbooks_identified=len(runbooks),
            validation_issues=warnings
        )

        sample_preview = [
            IngestionPreviewRow(**r) for r in preview_rows[:50]
        ]

        return IngestionPreviewResponse(
            success=True,
            summary=summary,
            sample_rows=sample_preview,
            runbook_titles=[rb["title"] for rb in runbooks]
        )

    @classmethod
    def commit_import(cls, db: Session, content: str, file_type: str = "csv", filename: str = "import") -> IngestionCommitResponse:
        """
        Commits parsed runbooks to the database idempotently.
        Records an IngestionJob audit record.
        """
        job = IngestionJob(
            source_type=file_type,
            status="processing",
            started_at=datetime.utcnow(),
            records_processed=0,
            records_created=0,
            records_updated=0,
            records_skipped=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        try:
            if file_type.lower() == "csv":
                runbooks_data, warnings, preview_rows = cls.parse_csv(content)
            else:
                runbooks_data, warnings, preview_rows = cls.parse_markdown(content, filename)

            skipped_preview_count = sum(1 for r in preview_rows if r["status"] == "skipped")
            job.records_processed = len(preview_rows)
            job.records_skipped = skipped_preview_count

            created_count = 0
            updated_count = 0

            for rb_data in runbooks_data:
                title = rb_data["title"]
                steps_data = rb_data.get("steps", [])
                meta = {
                    "form_type": rb_data.get("form_type"),
                    "ticket_type": rb_data.get("ticket_type"),
                    "category": rb_data.get("category"),
                    "product_area": rb_data.get("product_area"),
                    "components": rb_data.get("components"),
                    "source_url": rb_data.get("source_url")
                }
                new_hash = compute_runbook_hash(title, meta, steps_data)

                # Look up existing runbook by title (case-insensitive) or source_page_id
                query = db.query(Runbook).filter(Runbook.title.ilike(title))
                if rb_data.get("source_page_id"):
                    query = db.query(Runbook).filter(
                        (Runbook.title.ilike(title)) | (Runbook.source_page_id == rb_data["source_page_id"])
                    )
                existing = query.first()

                if existing:
                    # Idempotent check: if content hash identical, skip step churn
                    if existing.content_hash == new_hash:
                        job.records_skipped += 1
                        continue

                    # Update metadata
                    existing.form_type = rb_data.get("form_type") or existing.form_type
                    existing.ticket_type = rb_data.get("ticket_type") or existing.ticket_type
                    existing.category = rb_data.get("category") or existing.category
                    existing.product_area = rb_data.get("product_area") or existing.product_area
                    existing.components = rb_data.get("components") or existing.components
                    existing.source_type = rb_data.get("source_type") or existing.source_type
                    existing.source_url = rb_data.get("source_url") or existing.source_url
                    existing.content_hash = new_hash
                    existing.updated_at = datetime.utcnow()

                    # Replace steps cleanly
                    db.query(RunbookStep).filter(RunbookStep.runbook_id == existing.id).delete()
                    for s in sorted(steps_data, key=lambda x: int(x.get("step_number") or 1)):
                        step = RunbookStep(
                            runbook_id=existing.id,
                            step_number=int(s.get("step_number") or 1),
                            step_title=s.get("step_title"),
                            command=s.get("command"),
                            instruction=s.get("instruction"),
                            warning=s.get("warning"),
                            notes=s.get("notes")
                        )
                        db.add(step)
                    updated_count += 1
                else:
                    # Create new runbook
                    new_runbook = Runbook(
                        title=title,
                        form_type=rb_data.get("form_type"),
                        ticket_type=rb_data.get("ticket_type"),
                        category=rb_data.get("category"),
                        product_area=rb_data.get("product_area"),
                        components=rb_data.get("components"),
                        source_type=rb_data.get("source_type", file_type),
                        source_page_id=rb_data.get("source_page_id"),
                        source_url=rb_data.get("source_url"),
                        content_hash=new_hash
                    )
                    db.add(new_runbook)
                    db.flush()  # to get new_runbook.id

                    for s in sorted(steps_data, key=lambda x: int(x.get("step_number") or 1)):
                        step = RunbookStep(
                            runbook_id=new_runbook.id,
                            step_number=int(s.get("step_number") or 1),
                            step_title=s.get("step_title"),
                            command=s.get("command"),
                            instruction=s.get("instruction"),
                            warning=s.get("warning"),
                            notes=s.get("notes")
                        )
                        db.add(step)
                    created_count += 1

            job.records_created = created_count
            job.records_updated = updated_count
            job.status = "completed"
            job.completed_at = datetime.utcnow()
            if warnings:
                job.details = json.dumps({"warnings": warnings[:20]})
            db.commit()

            return IngestionCommitResponse(
                job_id=job.id,
                source_type=job.source_type,
                status=job.status,
                records_processed=job.records_processed,
                records_created=job.records_created,
                records_updated=job.records_updated,
                records_skipped=job.records_skipped,
                error_summary=job.error_summary,
                started_at=job.started_at,
                completed_at=job.completed_at
            )
        except Exception as e:
            db.rollback()
            job.status = "failed"
            job.completed_at = datetime.utcnow()
            job.error_summary = str(e)
            db.commit()
            logger.exception("Ingestion failed")
            raise
