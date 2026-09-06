from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.core.security import create_access_token
from app.schemas.auth import LoginRequest, LoginResponse
from app.schemas.user import PasswordChange, UserRead, UserRegister
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, user_id: int) -> None:
    token = create_access_token(user_id)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: DbSession, response: Response):
    """Public signup. Always creates a MEMBER; elevated roles are assigned by an admin."""
    user = user_service.create_user(db, data, role_name="MEMBER")
    _set_auth_cookie(response, user.id)
    return user


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: DbSession, response: Response):
    user = user_service.authenticate(db, data.email, data.password)
    _set_auth_cookie(response, user.id)
    return LoginResponse(user=user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")


@router.get("/me", response_model=UserRead)
def read_me(current_user: CurrentUser):
    return current_user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: PasswordChange, db: DbSession, current_user: CurrentUser):
    user_service.change_password(
        db, current_user, data.current_password, data.new_password
    )