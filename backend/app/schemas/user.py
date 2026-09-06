from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    job_title: str | None = Field(default=None, max_length=120)


class UserRegister(UserBase):
    # bcrypt silently truncates past 72 bytes, so cap it here and fail loudly
    password: str = Field(min_length=8, max_length=72)


class UserCreate(UserRegister):
    """Admin-side creation, where the role is chosen explicitly."""
    role_name: str = "MEMBER"


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    job_title: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    role_id: int | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    role: RoleRead
    created_at: datetime


class UserBrief(BaseModel):
    """Trimmed shape for embedding in report responses."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    job_title: str | None = None