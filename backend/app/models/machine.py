import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    model: Mapped[str] = mapped_column(String(255))
    location: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="online")
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[str] = mapped_column(String(50), default="low")
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    install_date: Mapped[str] = mapped_column(String(50))
    next_maintenance_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # noqa
    tags: Mapped[list] = mapped_column(JSON, default=list)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)

    # Detail fields
    description: Mapped[str] = mapped_column(Text, default="")
    manufacturer: Mapped[str] = mapped_column(String(255), default="")
    serial_number: Mapped[str] = mapped_column(String(255), default="")
    firmware_version: Mapped[str] = mapped_column(String(100), default="1.0.0")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
