import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.routes_health import router as health_router
from app.api.routes_runbooks import router as runbooks_router
from app.api.routes_ingestion import router as ingestion_router
from app.api.routes_chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("runbook_assistant")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Robotics Runbook Assistant Database Schema...")
    try:
        # Create tables if not existing (production migrations also managed via Alembic)
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema validated successfully.")
    except Exception as e:
        logger.warning(f"Database auto-creation warning (will be handled by migrations if DB is connecting): {e}")
    yield
    logger.info("Shutting down Runbook Assistant backend.")


app = FastAPI(
    title="ATI Motors Robotics Runbook Assistant API",
    description="Internal operational runbook search, structured retrieval, and troubleshooting knowledge base.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Frontend and Zendesk Support origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router, prefix="/api")
app.include_router(runbooks_router, prefix="/api")
app.include_router(ingestion_router, prefix="/api")
app.include_router(chat_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "Robotics Runbook Assistant",
        "documentation": "/docs",
        "health": "/api/health"
    }
