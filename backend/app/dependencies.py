from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.core.security import decode_token

bearer_scheme = HTTPBearer()

# Valid roles (ordered by privilege level)
ROLES = ("viewer", "operator", "technician", "manager", "admin")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory that enforces role-based access.

    Usage:
        @router.post("/admin-only", dependencies=[Depends(require_roles("admin"))])
        async def admin_endpoint(): ...

        @router.post("/manage", dependencies=[Depends(require_roles("manager", "admin"))])
        async def manage_endpoint(): ...
    """
    async def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}. Your role: {current_user.role}",
            )
        return current_user
    return _check


# Convenience shortcuts
require_admin = require_roles("admin")
require_manager = require_roles("manager", "admin")
require_technician = require_roles("technician", "manager", "admin")
require_operator = require_roles("operator", "technician", "manager", "admin")
