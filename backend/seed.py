import os
import sys

# Ensure backend in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.ingestion_service import IngestionService
from app.models.runbook import Runbook

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))


def seed_data():
    db = SessionLocal()
    print("Beginning Official ATI Motors Runbook Ingestion into PostgreSQL...")

    # Canonical Notion CSV
    canonical_csv = os.path.join(DATA_DIR, "notion_runbooks.csv")
    if not os.path.exists(canonical_csv):
        # Fallback to uploaded notion
        canonical_csv = os.path.join(DATA_DIR, "uploaded_notion/Runbooks 31271982801b8058ba26f93f067050c8.csv")

    if os.path.exists(canonical_csv):
        print(f"Importing Notion CSV: {canonical_csv}")
        with open(canonical_csv, "r", encoding="utf-8-sig") as f:
            content = f.read()
        res = IngestionService.commit_import(db, content, file_type="csv", filename="notion_runbooks.csv")
        print(f"  -> Created: {res.records_created}, Updated: {res.records_updated}, Skipped: {res.records_skipped}")

    total_rb = db.query(Runbook).count()
    print(f"Database seeding completed successfully! Total runbooks in database: {total_rb}")
    db.close()


if __name__ == "__main__":
    seed_data()
