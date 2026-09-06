from typing import Annotated, Callable

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User
from app.services import user_service

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    access_token: Annotated[str | None, Cookie(alias=settings.COOKIE_NAME)] = None,
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )

    if not access_token:
        raise credentials_error

    payload = decode_access_token(access_token)
    if payload is None or "sub" not in payload:
        raise credentials_error

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise credentials_error

    user = user_service.get_by_id(db, user_id)
    if user is None:
        raise credentials_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*allowed: str) -> Callable[[User], User]:
    """Build a dependency that admits only the named roles."""

    def dependency(current_user: CurrentUser) -> User:
        if current_user.role.name not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return dependency


# Ready-made guards for route signatures
ManagerUser = Annotated[User, Depends(require_roles("MANAGER", "ADMIN"))]
AdminUser = Annotated[User, Depends(require_roles("ADMIN"))]