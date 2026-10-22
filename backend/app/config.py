import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    DATABASE_URL: str = Field(
        default="postgresql://runbook_user:runbook_pass@localhost:5432/runbooks_db",
        description="SQLAlchemy database connection URI"
    )

    POSTGRES_USER: str = "runbook_user"
    POSTGRES_PASSWORD: str = "runbook_pass"
    POSTGRES_DB: str = "runbooks_db"
    POSTGRES_PORT: int = 5432

    ADMIN_API_KEY: str = "ati_admin_dev_secret_change_in_prod"
    ENABLE_PGVECTOR: bool = False
    NOTION_API_TOKEN: str = ""
    NOTION_DATABASE_ID: str = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
