from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import ReportStatus, ReviewAction


class SummaryMetrics(BaseModel):
    week_start_date: date
    total_team_members: int
    reports_submitted: int
    reports_approved: int
    reports_needs_correction: int
    reports_draft: int
    reports_not_started: int
    compliance_rate: float          # submitted or beyond, as a percentage
    open_blockers: int


class TrendPoint(BaseModel):
    week_start_date: date
    tasks_completed: int
    total_tasks: int
    reports_submitted: int


class MemberStatus(BaseModel):
    user_id: int
    full_name: str
    job_title: str | None = None
    status: ReportStatus | None = None   # None means nothing started
    report_id: int | None = None
    submitted_at: datetime | None = None
    task_count: int = 0
    total_hours: Decimal = Decimal("0")


class ProjectWorkload(BaseModel):
    project_id: int | None
    project_name: str
    color: str | None = None
    report_count: int
    task_count: int
    total_hours: Decimal


class WorkTypeHours(BaseModel):
    work_type: str
    total_hours: Decimal
    percentage: float


class ActivityItem(BaseModel):
    id: int
    report_id: int
    week_start_date: date
    action: ReviewAction | None = None   # None means a submission, not a review
    comment: str | None = None
    actor_name: str
    author_name: str
    occurred_at: datetime


class SectionEntry(BaseModel):
    """One member's entries for a single section, for the side-by-side view."""
    user_id: int
    full_name: str
    report_id: int | None = None
    status: ReportStatus | None = None
    items: list[str] = []
    key_item: str | None = None