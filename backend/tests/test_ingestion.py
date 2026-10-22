import os
from app.models.runbook import Runbook, RunbookStep
from app.models.ingestion import IngestionJob

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))


def test_preview_and_import_fictional_csv(client, db_session):
    csv_path = os.path.join(DATA_DIR, "sample_exports/sample_fictional_notion_runbook.csv")
    with open(csv_path, "r", encoding="utf-8") as f:
        csv_content = f.read()

    # 1. Preview
    preview_res = client.post("/api/ingestion/preview", data={"raw_content": csv_content, "file_type": "csv"})
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert pdata["success"] is True
    assert pdata["summary"]["runbooks_identified"] == 3
    assert "Fictional Rover Diagnostics" in pdata["runbook_titles"]

    # 2. Commit Import
    import_res = client.post("/api/ingestion/import", data={"raw_content": csv_content, "file_type": "csv"})
    assert import_res.status_code == 200
    idata = import_res.json()
    assert idata["status"] == "completed"
    assert idata["records_created"] == 3

    # Check DB
    rbs = db_session.query(Runbook).all()
    assert len(rbs) == 3

    diag_rb = db_session.query(Runbook).filter(Runbook.title == "Fictional Rover Diagnostics").first()
    assert diag_rb is not None
    assert len(diag_rb.steps) == 3
    assert "rover-cli diag" in diag_rb.steps[0].command

    # 3. Idempotency test: Re-importing same CSV must NOT create duplicates
    reimport_res = client.post("/api/ingestion/import", data={"raw_content": csv_content, "file_type": "csv"})
    assert reimport_res.status_code == 200
    reimport_data = reimport_res.json()
    assert reimport_data["records_created"] == 0
    assert reimport_data["records_skipped"] == 3

    # Confirm count is still 3 runbooks and not doubled
    rbs_after = db_session.query(Runbook).all()
    assert len(rbs_after) == 3


def test_markdown_import(client, db_session):
    md_path = os.path.join(DATA_DIR, "sample_exports/sample_markdown_export/Fictional_Lidar_Diagnostics.md")
    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    res = client.post("/api/ingestion/import", data={"raw_content": md_content, "file_type": "markdown"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "completed"
    assert data["records_created"] == 1

    rb = db_session.query(Runbook).filter(Runbook.title == "Fictional Lidar Diagnostics").first()
    assert rb is not None
    assert len(rb.steps) == 3
    assert "fictional_lidar_node" in rb.steps[0].command
    assert "emergency stop" in rb.steps[0].warning.lower()


def test_real_notion_csv_import_handles_empty_rows(client, db_session):
    # Tests the user's uploaded Notion CSV export with 59 rows and 7 trailing empty/select-option rows
    csv_path = os.path.join(DATA_DIR, "sample_exports/Runbooks 31271982801b8058ba26f93f067050c8.csv")
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        csv_content = f.read()

    # Preview
    preview_res = client.post("/api/ingestion/preview", data={"raw_content": csv_content, "file_type": "csv"})
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    # Verified that 7 trailing rows without runbook names are skipped
    assert pdata["summary"]["skipped_rows"] >= 7
    assert "Map Generation" in pdata["runbook_titles"]

    # Import
    import_res = client.post("/api/ingestion/import", data={"raw_content": csv_content, "file_type": "csv"})
    assert import_res.status_code == 200
    idata = import_res.json()
    assert idata["status"] == "completed"
    assert idata["records_created"] >= 20

    # Verify Map Generation runbook exists with its exact docker command
    map_rb = db_session.query(Runbook).filter(Runbook.title == "Map Generation").first()
    assert map_rb is not None
    assert len(map_rb.steps) == 1
    assert "mapping_and_stitching" in map_rb.steps[0].command
