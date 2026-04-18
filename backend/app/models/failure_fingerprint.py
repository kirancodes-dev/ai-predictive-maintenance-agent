"""
FailureFingerprint — stores sensor readings from known failed systems.

Each fingerprint captures a snapshot of sensor values (temperature, vibration,
current, rpm) at a specific "hours before failure" offset.  Multiple snapshots
form a trajectory that the system compares against live readings to see if a
machine is mirroring a known failure pattern.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, Integer, Text, JSON
from app.database import Base


class FailureFingerprint(Base):
    __tablename__ = "failure_fingerprints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Which machine type / tag this fingerprint applies to (e.g. "cnc", "pump", "conveyor")
    machine_type = Column(String, nullable=False, index=True)
    # Human-readable label for the failure event
    label = Column(String, nullable=False)
    # The type of failure (bearing-wear, thermal-runaway, cavitation, belt-slip, etc.)
    failure_type = Column(String, nullable=False)

    # Sensor readings at the time of (or approaching) failure
    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    rpm = Column(Float, nullable=True)

    # How many hours before the actual failure this snapshot was taken
    # 0 = at failure, 1 = 1 hour before, 24 = 24 hours before, etc.
    hours_before_failure = Column(Float, nullable=False, default=0.0)

    # Optional: the source of this fingerprint
    source = Column(String, nullable=True, default="manual")  # manual | historical | seed

    # Extra metadata (JSON)
    metadata_ = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
