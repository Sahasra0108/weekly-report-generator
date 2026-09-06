from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import hash_password, verify_password
from app.models import Role, User
from app.schemas.user import UserCreate, UserRegister, UserUpdate


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(
        select(User).options(selectinload(User.role)).where(User.email == email.lower())
    )


def get_by_id(db: Session, user_id: int) -> User | None:
    return db.scalar(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    )


def get_role_by_name(db: Session, name: str) -> Role:
    role = db.scalar(select(Role).where(Role.name == name))
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown role: {name}"
        )
    return role


def create_user(db: Session, data: UserRegister | UserCreate, role_name: str = "MEMBER") -> User:
    if get_by_email(db, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    resolved_role = getattr(data, "role_name", None) or role_name
    role = get_role_by_name(db, resolved_role)

    user = User(
        email=data.email.lower(),
        full_name=data.full_name,
        job_title=data.job_title,
        hashed_password=hash_password(data.password),
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = get_by_email(db, email)

    # Hash a dummy value when the user is missing, so the response time
    # doesn't reveal whether the email exists.
    if user is None:
        hash_password("dummy_value_for_timing")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return user


def list_users(db: Session, include_inactive: bool = False) -> list[User]:
    stmt = select(User).options(selectinload(User.role)).order_by(User.full_name)
    if not include_inactive:
        stmt = stmt.where(User.is_active.is_(True))
    return list(db.scalars(stmt))


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current: str, new: str) -> None:
    if not verify_password(current, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.hashed_password = hash_password(new)
    db.commit()


def deactivate_user(db: Session, user: User) -> None:
    """Soft delete - reports reference users historically."""
    user.is_active = False
    db.commit()