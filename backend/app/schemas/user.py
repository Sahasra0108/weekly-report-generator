from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.core.password import MAX_LENGTH, MIN_LENGTH, validate_password


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
    password: str = Field(min_length=MIN_LENGTH, max_length=MAX_LENGTH)

    @model_validator(mode="after")
    def check_password_strength(self):
        validate_password(self.password, email=self.email)
        return self


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
    new_password: str = Field(min_length=MIN_LENGTH, max_length=MAX_LENGTH)

    @model_validator(mode="after")
    def check_new_password(self):
        validate_password(self.new_password)
        if self.new_password == self.current_password:
            raise ValueError("The new password must be different from the current one")
        return self


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