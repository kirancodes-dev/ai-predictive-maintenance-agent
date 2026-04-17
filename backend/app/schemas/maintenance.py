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

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, r):
        return cls(
            id=r.id,
            machineId=r.machine_id,
            machineName=r.machine_name,
            type=r.type,
            status=r.status,
            title=r.title,
            description=r.description or "",
            scheduledDate=r.scheduled_date,
            completedDate=r.completed_date,
            assignedTo=r.assigned_to,
            estimatedDuration=r.estimated_duration,
            actualDuration=r.actual_duration,
            cost=r.cost,
            notes=r.notes,
            partsReplaced=r.parts_replaced or [],
        )


class MaintenanceCreateRequest(BaseModel):
    machineId: str
    type: str
    title: str
    description: str = ""
    scheduledDate: str
    assignedTo: Optional[str] = None
    estimatedDuration: int = 60


class MaintenanceUpdateRequest(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    scheduledDate: Optional[str] = None
    status: Optional[str] = None
    assignedTo: Optional[str] = None
    estimatedDuration: Optional[int] = None
    actualDuration: Optional[int] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    completedDate: Optional[str] = None
    partsReplaced: Optional[List[str]] = None


class FailurePredictionOut(BaseModel):
    machineId: str
    machineName: str
    predictedFailureDate: str
    confidence: float
    failureType: str
    recommendation: str
    urgency: str
