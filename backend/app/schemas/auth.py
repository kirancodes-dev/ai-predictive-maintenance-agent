from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: AuthUserOut
    token: str
    refreshToken: str


class RefreshRequest(BaseModel):
    refreshToken: str


class TokenResponse(BaseModel):
    token: str
