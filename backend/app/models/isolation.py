"""
Machine Isolation model — tracks when machines are isolated (cut off)
to prevent cascade failures from spreading to downstream systems.

Isolation can be triggered:
  - Automatically by the automation loop when risk is critical
  - Manually by an operator via the API
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class MachineIsolation(Base):
    __tablename__ = "machine_isolations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    machine_id: Mapped[str] = mapped_column(String, index=True)
    machine_name: Mapped[str] = mapped_column(String(255))

    # Isolation state
    is_isolated: Mapped[bool] = mapped_column(Boolean, default=True)
    isolation_type: Mapped[str] = mapped_column(String(50))  # auto | manual
    reason: Mapped[str] = mapped_column(Text, default="")
    risk_score_at_isolation: Mapped[float] = mapped_column(Float, default=0.0)

    # Which downstream machines were protected
    protected_machine_ids: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # comma-separated
    protected_machine_names: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Who / what triggered it
    triggered_by: Mapped[str] = mapped_column(String(255), default="system")

    # Timestamps
    isolated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    released_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    released_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
