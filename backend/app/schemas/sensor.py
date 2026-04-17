from pydantic import BaseModel
from typing import List, Optional


class SensorOut(BaseModel):
    id: str
    machineId: str
    name: str
    type: str
    unit: str
    minThreshold: float
    maxThreshold: float
    criticalMin: float
    criticalMax: float
    isActive: bool

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_sensor(cls, s):
        return cls(
            id=s.id,
            machineId=s.machine_id,
            name=s.name,
            type=s.type,
            unit=s.unit,
            minThreshold=s.min_threshold,
            maxThreshold=s.max_threshold,
            criticalMin=s.critical_min,
            criticalMax=s.critical_max,
            isActive=s.is_active,
        )


class SensorReadingOut(BaseModel):
    sensorId: str
    machineId: str
    type: str
    value: float
    unit: str
    timestamp: str
    isAnomaly: bool


class SensorDataPoint(BaseModel):
    timestamp: str
    value: float


class SensorHistoryOut(BaseModel):
    sensorId: str
    data: List[SensorDataPoint]
