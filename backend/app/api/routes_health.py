from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def check_health(db: Session = Depends(get_db)):
    """Health check endpoint confirming database connectivity and service status."""
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "Robotics Runbook Assistant API",
        "version": "1.0.0"
    }
