from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./predictive_maintenance.db"
    SECRET_KEY: str = "change-this-secret-key-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SIMULATION_SERVER_URL: str = "http://localhost:3000"
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'
    ENVIRONMENT: str = "development"

    # Email notifications (SMTP)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    NOTIFICATION_EMAIL_ENABLED: bool = False
    NOTIFICATION_EMAIL_RECIPIENTS: str = "[]"

    # Slack notifications
    SLACK_WEBHOOK_URL: str = ""
    NOTIFICATION_SLACK_ENABLED: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["http://localhost:3000", "http://localhost:5173"]

    @property
    def email_recipients_list(self) -> List[str]:
        try:
            return json.loads(self.NOTIFICATION_EMAIL_RECIPIENTS)
        except Exception:
            return []

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
