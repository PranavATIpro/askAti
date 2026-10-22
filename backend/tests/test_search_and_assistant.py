from app.models.runbook import Runbook, RunbookStep


def seed_test_runbooks(db_session):
    rb1 = Runbook(
        title="Map Generation",
        category="Software",
        product_area="Map",
        components="Generate Map",
        ticket_type="Knowledge"
    )
    db_session.add(rb1)
    db_session.flush()

    s1 = RunbookStep(
        runbook_id=rb1.id,
        step_number=1,
        step_title="Command to generate",
        command="docker run --gpus all -it mapping_and_stitching mapping --data_dir /app/data",
        instruction="This command is used for generating map",
        warning="Do not interrupt posegraph optimization once started.",
        notes="We can adjust zmax and zmin."
    )
    db_session.add(s1)

    rb2 = Runbook(
        title="Find Obstacle Detected on Streamlit",
        category="Software",
        product_area="Streamlit",
        components="Lidar",
        ticket_type="Knowledge"
    )
    db_session.add(rb2)
    db_session.flush()

    s2 = RunbookStep(
        runbook_id=rb2.id,
        step_number=1,
        step_title="Inspect Obstacle Frame",
        command=None,
        instruction="Open Streamlit, go to Errors, get frame id, go to lidar insert frame id.",
        warning=None,
        notes="Shows visualizer image."
    )
    db_session.add(s2)
    db_session.commit()


def test_search_endpoint(client, db_session):
    seed_test_runbooks(db_session)

    # Search for "map"
    res = client.get("/api/runbooks?q=map")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Map Generation"

    # Search with category facet filter
    res2 = client.get("/api/runbooks?category=Software")
    assert res2.status_code == 200
    assert res2.json()["total"] == 2


def test_assistant_chat_endpoint_exact_match(client, db_session):
    seed_test_runbooks(db_session)

    # Query for map generation
    res = client.post("/api/assistant/chat", json={"query": "How do I generate a map?"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "assistant"
    assert "Map Generation" in data["content"]
    assert len(data["commands"]) == 1
    assert "mapping_and_stitching" in data["commands"][0]["command"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["runbook_title"] == "Map Generation"
    assert len(data["steps"]) == 1


def test_assistant_chat_endpoint_unmatched_query(client, db_session):
    seed_test_runbooks(db_session)

    # Ask something completely unrelated
    res = client.post("/api/assistant/chat", json={"query": "How do I bake a chocolate cake?"})
    assert res.status_code == 200
    data = res.json()
    assert "No Documented Runbook Found" in data["content"]
    assert data["confidence"] == 0.0
    assert len(data["sources"]) == 0
