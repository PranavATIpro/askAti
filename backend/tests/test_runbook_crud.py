from app.models.runbook import Runbook, RunbookStep


def test_create_update_delete_runbook(client, db_session):
    # 1. Create runbook
    payload = {
        "title": "Wheel Encoder Test Procedure",
        "category": "Hardware",
        "product_area": "Sensor",
        "components": "Encoder",
        "steps": [
            {
                "step_number": 1,
                "step_title": "Check Log",
                "command": "tail -f run/mule.log",
                "instruction": "Check for missing encoder ticks",
                "warning": "Do not touch wheel assembly while active",
                "notes": "Look for stale_ode error"
            }
        ]
    }
    res = client.post("/api/runbooks", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Wheel Encoder Test Procedure"
    assert len(data["steps"]) == 1
    rb_id = data["id"]

    # 2. Update runbook
    update_payload = {
        "title": "Wheel Encoder Test Procedure v2",
        "steps": [
            {
                "step_number": 1,
                "step_title": "Check Log",
                "command": "tail -f run/mule.log",
                "instruction": "Check for missing encoder ticks"
            },
            {
                "step_number": 2,
                "step_title": "Restart Mule Container",
                "command": "docker restart mule",
                "instruction": "Restart container if ticks are stale"
            }
        ]
    }
    res_update = client.put(f"/api/runbooks/{rb_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_data = res_update.json()
    assert updated_data["title"] == "Wheel Encoder Test Procedure v2"
    assert len(updated_data["steps"]) == 2

    # 3. Delete runbook
    res_delete = client.delete(f"/api/runbooks/{rb_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["success"] is True

    # Confirm deletion
    res_get = client.get(f"/api/runbooks/{rb_id}")
    assert res_get.status_code == 404
