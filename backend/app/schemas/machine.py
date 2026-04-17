from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class MachineOut(BaseModel):
    id: str
    name: str
    model: str
    location: str
    status: str
    riskScore: float
    riskLevel: str
    lastSeen: str
    installDate: str
    nextMaintenanceDate: Optional[str] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_machine(cls, m):
        return cls(
            id=m.id,
            name=m.name,
            model=m.model,
            location=m.location,
            status=m.status,
            riskScore=m.risk_score,
            riskLevel=m.risk_level,
            lastSeen=m.last_seen.isoformat() if isinstance(m.last_seen, datetime) else m.last_seen,
            installDate=m.install_date,
            nextMaintenanceDate=m.next_maintenance_date,
            tags=m.tags or [],
            metadata=m.metadata_ or {},
        )


class MachineDetailOut(MachineOut):
    description: str = ""
    manufacturer: str = ""
    serialNumber: str = ""
    firmwareVersion: str = "1.0.0"
    sensors: List[str] = []
    maintenanceHistory: List[str] = []

    @classmethod
    def from_orm_machine(cls, m, sensor_ids=None, maintenance_ids=None):
        base = MachineOut.from_orm_machine(m)
        return cls(
            **base.model_dump(),
            description=m.description or "",
            manufacturer=m.manufacturer or "",
            serialNumber=m.serial_number or "",
            firmwareVersion=m.firmware_version or "1.0.0",
            sensors=sensor_ids or [],
            maintenanceHistory=maintenance_ids or [],
        )


class RiskOut(BaseModel):
    score: float
    level: str
