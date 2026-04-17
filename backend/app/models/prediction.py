import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class FailurePrediction(Base):
    """Persisted failure prediction record — one active record per machine."""

    __tablename__ = "failure_predictions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    machine_id: Mapped[str] = mapped_column(String, index=True)
    machine_name: Mapped[str] = mapped_column(String(255))

    # Core prediction
    predicted_failure_at: Mapped[datetime] = mapped_column(DateTime)
    estimated_hours_remaining: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.75)
    failure_type: Mapped[str] = mapped_column(String(255), default="General degradation")
    urgency: Mapped[str] = mapped_column(String(50), default="low")  # low|medium|high|critical|imminent
    recommendation: Mapped[str] = mapped_column(Text, default="")

    # Technician assignment (auto-assigned)
    assigned_technician_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    assigned_technician_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Auto-created maintenance work order id
    auto_work_order_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Notification flags to avoid duplicate alerts
    notified_72h: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_48h: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_24h: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_12h: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_6h: Mapped[bool] = mapped_column(Boolean, default=False)
    notified_1h: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
