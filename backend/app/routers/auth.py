from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import timedelta
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password, create_access_token, hash_password, decode_token, decode_token_allow_expired
from app.config import settings
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# --- NEW REGISTER MODEL ---
class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str


class RefreshRequest(BaseModel):
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# --- NEW REGISTER ENDPOINT ---
@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 1. Check if user already exists
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already exists")
        
    # 2. Create the new Admin user
    new_user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        name="System Admin",
        role="admin",
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    
    return {"data": {"message": "Admin user created successfully!"}}


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "data": {
            "accessToken": token,
            "tokenType": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "avatar": user.avatar,
            },
        }
    }


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "data": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "avatar": current_user.avatar,
        }
    }


@router.post("/logout")
async def logout(_: User = Depends(get_current_user)):
    return {"data": {"message": "Logged out successfully"}}


@router.put("/me")
async def update_profile(
    body: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.email is not None:
        email = body.email.strip().lower()
        if email != current_user.email:
            existing = await db.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                raise HTTPException(status_code=409, detail="Email already in use")
            current_user.email = email
    await db.commit()
    await db.refresh(current_user)
    return {
        "data": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": current_user.role,
            "avatar": current_user.avatar,
        }
    }


@router.put("/password")
async def change_password(
    body: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.currentPassword, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(body.newPassword)
    await db.commit()
    return {"data": {"message": "Password updated successfully"}}


@router.post("/refresh")
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    # Allow expired tokens so the refresh flow works after token expiry
    payload = decode_token_allow_expired(body.token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    new_token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "data": {
            "accessToken": new_token,
            "tokenType": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "avatar": user.avatar,
            },
        }
    }