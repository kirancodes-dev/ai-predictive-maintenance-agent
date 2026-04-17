import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    machine_id: Mapped[str] = mapped_column(String, index=True)
    machine_name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))  # preventive|corrective|predictive|inspection
    status: Mapped[str] = mapped_column(String(50), default="scheduled")
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="")
    scheduled_date: Mapped[str] = mapped_column(String(50))
    completed_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    estimated_duration: Mapped[int] = mapped_column(Integer, default=60)
    actual_duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cost: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parts_replaced: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
