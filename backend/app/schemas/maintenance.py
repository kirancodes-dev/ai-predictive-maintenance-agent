from pydantic import BaseModel
from typing import Optional, List


class MaintenanceOut(BaseModel):
    id: str
    machineId: str
    machineName: str
    type: str
    status: str
    title: str
    description: str
    scheduledDate: str
    completedDate: Optional[str] = None
    assignedTo: Optional[str] = None
    estimatedDuration: int
    actualDuration: Optional[int] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    partsReplaced: List[str] = []
    createdAt: str

    class Config:
        from_attributes = True


class MaintenanceCreateRequest(BaseModel):
    machineId: str
    type: str
    title: str
    description: str = ""
    scheduledDate: str
    assignedTo: Optional[str] = None
    estimatedDuration: int = 60


class MaintenanceUpdateRequest(BaseModel):
    status: Optional[str] = None
    completedDate: Optional[str] = None
    actualDuration: Optional[int] = None
    cost: Optional[float] = None
    notes: Optional[str] = None


class FailurePredictionOut(BaseModel):
    machineId: str
    machineName: str
    predictedFailureDate: str
    confidence: float
    failureType: str
    recommendation: str
    urgency: str
