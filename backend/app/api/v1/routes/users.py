from fastapi import APIRouter, HTTPException, status

from app.core.deps import AdminUser, CurrentUser, DbSession, ManagerUser
from app.schemas.user import RoleRead, UserCreate, UserRead, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(db: DbSession, current_user: ManagerUser, include_inactive: bool = False):
    """Managers and admins can see the team roster."""
    return user_service.list_users(db, include_inactive=include_inactive)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: DbSession, current_user: AdminUser):
    """Admin-only: create a user with an explicit role."""
    return user_service.create_user(db, data)


@router.get("/roles", response_model=list[RoleRead])
def list_roles(db: DbSession, current_user: AdminUser):
    from sqlalchemy import select
    from app.models import Role
    return list(db.scalars(select(Role).order_by(Role.id)))


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: int, db: DbSession, current_user: CurrentUser):
    """Anyone can fetch their own record; managers and admins can fetch anyone's."""
    if current_user.id != user_id and current_user.role.name not in ("MANAGER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this user",
        )

    user = user_service.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserUpdate, db: DbSession, current_user: AdminUser):
    user = user_service.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id and data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    return user_service.update_user(db, user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(user_id: int, db: DbSession, current_user: AdminUser):
    user = user_service.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    user_service.deactivate_user(db, user)