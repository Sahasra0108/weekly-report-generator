from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserBrief


class ProjectBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")


class ProjectCreate(ProjectBase):
    member_ids: list[int] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active: bool | None = None
    member_ids: list[int] | None = None


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    members: list[UserBrief] = Field(default_factory=list)


class ProjectBrief(BaseModel):
    """Trimmed shape for embedding in report responses."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str | None = None