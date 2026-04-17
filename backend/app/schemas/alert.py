from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertOut(BaseModel):
    id: str
    machineId: str
    machineName: str
    severity: str
    status: str
    title: str
    message: str
    timestamp: str
    acknowledgedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    acknowledgedBy: Optional[str] = None
    sensorId: Optional[str] = None
    value: Optional[float] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_alert(cls, a):
        def dt(v):
            if v is None:
                return None
            return v.isoformat() if isinstance(v, datetime) else v

        return cls(
            id=a.id,
            machineId=a.machine_id,
            machineName=a.machine_name,
            severity=a.severity,
            status=a.status,
            title=a.title,
            message=a.message,
            timestamp=dt(a.timestamp),
            acknowledgedAt=dt(a.acknowledged_at),
            resolvedAt=dt(a.resolved_at),
            acknowledgedBy=a.acknowledged_by,
            sensorId=a.sensor_id,
            value=a.value,
        )
