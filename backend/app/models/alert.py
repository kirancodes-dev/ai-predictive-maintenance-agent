import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    machine_id: Mapped[str] = mapped_column(String, index=True)
    machine_name: Mapped[str] = mapped_column(String(255))
    severity: Mapped[str] = mapped_column(String(50))  # info|warning|error|critical
    status: Mapped[str] = mapped_column(String(50), default="active")  # active|acknowledged|resolved
    title: Mapped[str] = mapped_column(String(500))
    message: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sensor_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
