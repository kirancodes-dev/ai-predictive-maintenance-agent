from pydantic import BaseModel
from typing import Optional, List, Generic, TypeVar

T = TypeVar("T")


class ApiResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int
