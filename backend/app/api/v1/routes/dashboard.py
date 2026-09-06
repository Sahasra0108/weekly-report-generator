from datetime import date

from fastapi import APIRouter, Query

from app.core.deps import DbSession, ManagerUser
from app.schemas.dashboard import (
    ActivityItem, MemberStatus, ProjectWorkload, SectionEntry,
    SummaryMetrics, TrendPoint, WorkTypeHours,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=SummaryMetrics)
def summary(
    db: DbSession,
    current_user: ManagerUser,
    week_start: date | None = None,
    project_id: int | None = None,
):
    return dashboard_service.summary_metrics(db, week_start, project_id)


@router.get("/trend", response_model=list[TrendPoint])
def trend(
    db: DbSession,
    current_user: ManagerUser,
    weeks: int = Query(8, ge=1, le=52),
    user_id: int | None = None,
    project_id: int | None = None,
):
    return dashboard_service.tasks_trend(db, weeks, user_id, project_id)


@router.get("/members", response_model=list[MemberStatus])
def members(db: DbSession, current_user: ManagerUser, week_start: date | None = None):
    return dashboard_service.member_statuses(db, week_start)


@router.get("/projects", response_model=list[ProjectWorkload])
def projects(
    db: DbSession,
    current_user: ManagerUser,
    date_from: date | None = None,
    date_to: date | None = None,
):
    return dashboard_service.project_workload(db, date_from, date_to)


@router.get("/work-types", response_model=list[WorkTypeHours])
def work_types(
    db: DbSession,
    current_user: ManagerUser,
    date_from: date | None = None,
    date_to: date | None = None,
    project_id: int | None = None,
):
    return dashboard_service.hours_by_work_type(db, date_from, date_to, project_id)


@router.get("/activity", response_model=list[ActivityItem])
def activity(db: DbSession, current_user: ManagerUser, limit: int = Query(15, ge=1, le=50)):
    return dashboard_service.recent_activity(db, limit)


@router.get("/section", response_model=list[SectionEntry])
def section(
    db: DbSession,
    current_user: ManagerUser,
    section: str = Query("blockers", pattern="^(blockers|achievements)$"),
    week_start: date | None = None,
):
    """Bonus view: one section across all team members for a given week."""
    return dashboard_service.section_across_team(db, section, week_start)