from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ReportStatus, ReviewAction, TaskPriority, TaskStatus, WorkType
from app.schemas.project import ProjectBrief
from app.schemas.user import UserBrief


# ---- child rows ----

class TaskIn(BaseModel):
    task_name: str = Field(min_length=1, max_length=255)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.IN_PROGRESS
    planned_percent: int = Field(default=0, ge=0, le=100)
    actual_percent: int = Field(default=0, ge=0, le=100)
    hours_planned: Decimal = Field(default=Decimal("0"), ge=0, le=999)
    hours_spent: Decimal = Field(default=Decimal("0"), ge=0, le=999)
    output: str | None = None


class TaskRead(TaskIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sort_order: int


class PlannedTaskIn(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    priority: TaskPriority = TaskPriority.MEDIUM


class PlannedTaskRead(PlannedTaskIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sort_order: int


class BlockerIn(BaseModel):
    description: str = Field(min_length=1)
    is_key_issue: bool = False
    is_resolved: bool = False


class BlockerRead(BlockerIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sort_order: int


class AchievementIn(BaseModel):
    description: str = Field(min_length=1)
    is_key_achievement: bool = False


class AchievementRead(AchievementIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sort_order: int


class HoursIn(BaseModel):
    work_type: WorkType
    hours: Decimal = Field(default=Decimal("0"), ge=0, le=168)


class HoursRead(HoursIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---- report ----

class ReportWrite(BaseModel):
    """Shared shape for create and update."""
    week_start_date: date
    project_id: int | None = None
    notes: str | None = None
    links: str | None = None

    tasks: list[TaskIn] = Field(default_factory=list)
    planned_tasks: list[PlannedTaskIn] = Field(default_factory=list)
    blockers: list[BlockerIn] = Field(default_factory=list)
    achievements: list[AchievementIn] = Field(default_factory=list)
    hours: list[HoursIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_week_and_flags(self):
        if self.week_start_date.weekday() != 0:
            raise ValueError("week_start_date must be a Monday")

        if sum(1 for b in self.blockers if b.is_key_issue) > 1:
            raise ValueError("Only one blocker can be flagged as the key issue")

        if sum(1 for a in self.achievements if a.is_key_achievement) > 1:
            raise ValueError("Only one achievement can be flagged as the key achievement")

        seen = {h.work_type for h in self.hours}
        if len(seen) != len(self.hours):
            raise ValueError("Each work type may appear only once in the hours breakdown")

        return self


class ReportCreate(ReportWrite):
    pass


class ReportUpdate(ReportWrite):
    pass


class ReviewCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: ReviewAction
    comment: str | None
    created_at: datetime
    version_id: int | None
    reviewer: UserBrief | None = None


class VersionBrief(BaseModel):
    """List item for version history - no snapshot payload."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    version_no: int
    submitted_at: datetime


class VersionRead(VersionBrief):
    snapshot: dict[str, Any]


class ReportSummary(BaseModel):
    """List-view shape. Deliberately excludes child collections."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_start_date: date
    week_end_date: date
    status: ReportStatus
    current_version_no: int
    submitted_at: datetime | None
    reviewed_at: datetime | None
    author: UserBrief
    project: ProjectBrief | None = None
    task_count: int = 0
    open_blocker_count: int = 0
    total_hours: Decimal = Decimal("0")


class ReportDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_start_date: date
    week_end_date: date
    status: ReportStatus
    current_version_no: int
    notes: str | None
    links: str | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    author: UserBrief
    project: ProjectBrief | None = None
    reviewer: UserBrief | None = None

    tasks: list[TaskRead] = Field(default_factory=list)
    planned_tasks: list[PlannedTaskRead] = Field(default_factory=list)
    blockers: list[BlockerRead] = Field(default_factory=list)
    achievements: list[AchievementRead] = Field(default_factory=list)
    hours: list[HoursRead] = Field(default_factory=list)

    versions: list[VersionBrief] = Field(default_factory=list)
    review_comments: list[ReviewCommentRead] = Field(default_factory=list)

    is_editable: bool = False


class ReviewRequest(BaseModel):
    action: ReviewAction
    comment: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def comment_required_for_changes(self):
        if self.action is ReviewAction.REQUESTED_CHANGES and not (self.comment or "").strip():
            raise ValueError("A comment is required when requesting changes")
        return self


class PaginatedReports(BaseModel):
    items: list[ReportSummary]
    total: int
    page: int
    page_size: int
    pages: int