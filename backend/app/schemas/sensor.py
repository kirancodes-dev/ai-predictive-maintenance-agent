from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SensorDataPoint(BaseModel):
    timestamp: str
    value: float


class SensorReadingOut(BaseModel):
    sensorId: str
    machineId: str
    type: str
    value: float
    unit: str
    timestamp: str
    isAnomaly: bool


class SensorHistoryOut(BaseModel):
    sensorId: str
    machineId: str
    type: str
    unit: str
    data: list[SensorDataPoint]
