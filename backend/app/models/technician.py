import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Technician(Base):
    """Represents a maintenance technician with skill set and shift schedule."""

    __tablename__ = "technicians"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    specialty: Mapped[str] = mapped_column(String(255), default="General Maintenance")
    # JSON list of machine tags / types they are qualified for
    # e.g. ["cnc", "pump", "conveyor", "compressor"]
    skills: Mapped[list] = mapped_column(JSON, default=list)
    # Shift window in UTC hour (0-23)
    shift_start_hour: Mapped[int] = mapped_column(Integer, default=8)
    shift_end_hour: Mapped[int] = mapped_column(Integer, default=20)
    # Whether currently available (not on a job / break / off)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    # Machine currently assigned to (null = free)
    current_assignment_machine_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_assignment_machine_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # ISO timestamp when current assignment started
    assignment_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # Estimated minutes to finish current job
    estimated_free_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
