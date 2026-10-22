import os
import sys

# Ensure backend in pythonpath
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.ingestion_service import IngestionService

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))


def seed_data():
    db = SessionLocal()
    print("Beginning Runbook Data Ingestion into PostgreSQL...")

    # 1. Ingest real Notion CSV export if available
    real_csv = os.path.join(DATA_DIR, "sample_exports/Runbooks 31271982801b8058ba26f93f067050c8.csv")
    if os.path.exists(real_csv):
        print(f"Importing Notion CSV: {real_csv}")
        with open(real_csv, "r", encoding="utf-8-sig") as f:
            content = f.read()
        res = IngestionService.commit_import(db, content, file_type="csv", filename="Runbooks_Notion.csv")
        print(f"  -> Created: {res.records_created}, Updated: {res.records_updated}, Skipped: {res.records_skipped}")

    # 2. Ingest fictional sample CSV
    fictional_csv = os.path.join(DATA_DIR, "sample_exports/sample_fictional_notion_runbook.csv")
    if os.path.exists(fictional_csv):
        print(f"Importing Sample CSV: {fictional_csv}")
        with open(fictional_csv, "r", encoding="utf-8") as f:
            content = f.read()
        res = IngestionService.commit_import(db, content, file_type="csv", filename="sample_fictional.csv")
        print(f"  -> Created: {res.records_created}, Updated: {res.records_updated}, Skipped: {res.records_skipped}")

    # 3. Ingest Markdown exports
    md_dir = os.path.join(DATA_DIR, "sample_exports/sample_markdown_export")
    if os.path.exists(md_dir):
        for fname in os.listdir(md_dir):
            if fname.endswith(".md"):
                fpath = os.path.join(md_dir, fname)
                print(f"Importing Markdown Runbook: {fname}")
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                res = IngestionService.commit_import(db, content, file_type="markdown", filename=fname)
                print(f"  -> Created: {res.records_created}, Updated: {res.records_updated}")

    db.close()
    print("Database seeding completed successfully!")


if __name__ == "__main__":
    seed_data()
