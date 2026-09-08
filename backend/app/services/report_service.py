from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Achievement, Blocker, HoursEntry, PlannedTask, Report, ReportStatus,
    ReportTask, ReportVersion, ReviewAction, ReviewComment, User,
)
from app.schemas.report import ReportCreate, ReportUpdate, ReviewRequest

EDITABLE_STATUSES = (ReportStatus.DRAFT, ReportStatus.NEEDS_CORRECTION)


def _detail_query():
    return select(Report).options(
        selectinload(Report.author).selectinload(User.role),
        selectinload(Report.project),
        selectinload(Report.reviewer),
        selectinload(Report.tasks),
        selectinload(Report.planned_tasks),
        selectinload(Report.blockers),
        selectinload(Report.achievements),
        selectinload(Report.hours),
        selectinload(Report.versions),
        selectinload(Report.review_comments).selectinload(ReviewComment.reviewer),
    )


def is_manager(user: User) -> bool:
    return user.role.name in ("MANAGER", "ADMIN")


def get_for_user(db: Session, report_id: int, user: User) -> Report:
    """Fetch a report, enforcing that the caller is allowed to see it."""
    report = db.scalar(_detail_query().where(Report.id == report_id))
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    if report.user_id != user.id and not is_manager(user):
        # 404 rather than 403 - don't confirm the report exists to someone
        # who has no business knowing.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    return report


def _replace_children(db: Session, report: Report, data: ReportCreate | ReportUpdate) -> None:
    for child in (
        *report.tasks,
        *report.planned_tasks,
        *report.blockers,
        *report.achievements,
        *report.hours,
    ):
        db.delete(child)
    db.flush()

    report.tasks = [
        ReportTask(**row.model_dump(), sort_order=i)
        for i, row in enumerate(data.tasks)
    ]
    report.planned_tasks = [
        PlannedTask(**row.model_dump(), sort_order=i)
        for i, row in enumerate(data.planned_tasks)
    ]
    report.blockers = [
        Blocker(**row.model_dump(), sort_order=i)
        for i, row in enumerate(data.blockers)
    ]
    report.achievements = [
        Achievement(**row.model_dump(), sort_order=i)
        for i, row in enumerate(data.achievements)
    ]
    report.hours = [HoursEntry(**row.model_dump()) for row in data.hours]


def create_report(db: Session, data: ReportCreate, author: User) -> Report:
    existing = db.scalar(
        select(Report).where(
            Report.user_id == author.id,
            Report.week_start_date == data.week_start_date,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a report for this week",
        )

    report = Report(
        user_id=author.id,
        project_id=data.project_id,
        week_start_date=data.week_start_date,
        week_end_date=data.week_start_date + timedelta(days=4),
        status=ReportStatus.DRAFT,
        notes=data.notes,
        links=data.links,
    )
    db.add(report)
    db.flush()

    _replace_children(db, report, data)
    db.commit()

    return get_for_user(db, report.id, author)


def update_report(db: Session, report: Report, data: ReportUpdate, user: User) -> Report:
    if report.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own reports",
        )

    if report.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A report with status {report.status.value} cannot be edited",
        )

    if data.week_start_date != report.week_start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The week of an existing report cannot be changed",
        )

    report.project_id = data.project_id
    report.notes = data.notes
    report.links = data.links
    _replace_children(db, report, data)

    db.commit()
    return get_for_user(db, report.id, user)


def delete_report(db: Session, report: Report, user: User) -> None:
    if report.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reports",
        )
    if report.status is not ReportStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only drafts can be deleted",
        )
    db.delete(report)
    db.commit()


# ---- versioning ----

def build_snapshot(report: Report) -> dict:
    return {
        "week_start_date": report.week_start_date.isoformat(),
        "week_end_date": report.week_end_date.isoformat(),
        "project_id": report.project_id,
        "project_name": report.project.name if report.project else None,
        "notes": report.notes,
        "links": report.links,
        "tasks": [
            {
                "task_name": t.task_name,
                "priority": t.priority.value,
                "status": t.status.value,
                "planned_percent": t.planned_percent,
                "actual_percent": t.actual_percent,
                "hours_planned": str(t.hours_planned),
                "hours_spent": str(t.hours_spent),
                "output": t.output,
            }
            for t in report.tasks
        ],
        "planned_tasks": [
            {"description": p.description, "priority": p.priority.value}
            for p in report.planned_tasks
        ],
        "blockers": [
            {
                "description": b.description,
                "is_key_issue": b.is_key_issue,
                "is_resolved": b.is_resolved,
            }
            for b in report.blockers
        ],
        "achievements": [
            {"description": a.description, "is_key_achievement": a.is_key_achievement}
            for a in report.achievements
        ],
        "hours": [
            {"work_type": h.work_type.value, "hours": str(h.hours)}
            for h in report.hours
        ],
    }


def _submission_problems(report: Report) -> list[str]:
    problems: list[str] = []

    if report.project_id is None:
        problems.append("Select a project or category")

    named_tasks = [t for t in report.tasks if t.task_name.strip()]
    if not named_tasks:
        problems.append("Add at least one completed task")

    total_hours = sum((h.hours for h in report.hours), Decimal("0"))
    if total_hours <= 0:
        problems.append("Record your hours by task type")

    return problems


def submit_report(db: Session, report: Report, user: User) -> Report:
    if report.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit your own reports",
        )

    if report.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A report with status {report.status.value} cannot be submitted",
        )

    problems = _submission_problems(report)
    if problems:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This report is not ready to submit: " + "; ".join(problems),
        )

    now = datetime.now(timezone.utc)
    report.current_version_no += 1
    db.add(
        ReportVersion(
            report_id=report.id,
            version_no=report.current_version_no,
            snapshot=build_snapshot(report),
            submitted_at=now,
            submitted_by_id=user.id,
        )
    )

    report.status = ReportStatus.SUBMITTED
    report.submitted_at = now
    db.commit()

    return get_for_user(db, report.id, user)


def review_report(db: Session, report: Report, data: ReviewRequest, reviewer: User) -> Report:
    if not is_manager(reviewer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can review reports",
        )

    if report.status is not ReportStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only a submitted report can be reviewed",
        )

    if report.user_id == reviewer.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot review your own report",
        )

    latest_version = db.scalar(
        select(ReportVersion)
        .where(ReportVersion.report_id == report.id)
        .order_by(ReportVersion.version_no.desc())
        .limit(1)
    )

    now = datetime.now(timezone.utc)
    db.add(
        ReviewComment(
            report_id=report.id,
            version_id=latest_version.id if latest_version else None,
            reviewer_id=reviewer.id,
            action=data.action,
            comment=data.comment,
            created_at=now,
        )
    )

    report.status = (
        ReportStatus.APPROVED
        if data.action is ReviewAction.APPROVED
        else ReportStatus.NEEDS_CORRECTION
    )
    report.reviewed_at = now
    report.reviewed_by_id = reviewer.id
    db.commit()

    return get_for_user(db, report.id, reviewer)


# ---- listing ----

def list_reports(
    db: Session,
    viewer: User,
    *,
    page: int = 1,
    page_size: int = 20,
    user_id: int | None = None,
    project_id: int | None = None,
    report_status: ReportStatus | None = None,
    week_start: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> tuple[list[Report], int]:
    stmt = select(Report).options(
        selectinload(Report.author).selectinload(User.role),
        selectinload(Report.project),
        selectinload(Report.tasks),
        selectinload(Report.blockers),
        selectinload(Report.hours),
    )

    if is_manager(viewer) and user_id != viewer.id:
        if user_id is not None:
            stmt = stmt.where(Report.user_id == user_id)
        # Drafts belong to their author until submitted.
        stmt = stmt.where(Report.status != ReportStatus.DRAFT)
    else:
        stmt = stmt.where(Report.user_id == viewer.id)

    if project_id is not None:
        stmt = stmt.where(Report.project_id == project_id)
    if report_status is not None:
        stmt = stmt.where(Report.status == report_status)
    if week_start is not None:
        stmt = stmt.where(Report.week_start_date == week_start)
    if date_from is not None:
        stmt = stmt.where(Report.week_start_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Report.week_start_date <= date_to)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    stmt = (
        stmt.order_by(Report.week_start_date.desc(), Report.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return list(db.scalars(stmt)), total


def to_summary_fields(report: Report) -> dict:
    """Computed fields the list view needs."""
    return {
        "task_count": len(report.tasks),
        "open_blocker_count": sum(1 for b in report.blockers if not b.is_resolved),
        "total_hours": sum((h.hours for h in report.hours), Decimal("0")),
    }


def get_versions(db: Session, report: Report) -> list[ReportVersion]:
    return list(
        db.scalars(
            select(ReportVersion)
            .where(ReportVersion.report_id == report.id)
            .order_by(ReportVersion.version_no.desc())
        )
    )


def get_version(db: Session, report: Report, version_no: int) -> ReportVersion:
    version = db.scalar(
        select(ReportVersion).where(
            ReportVersion.report_id == report.id,
            ReportVersion.version_no == version_no,
        )
    )
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    return version