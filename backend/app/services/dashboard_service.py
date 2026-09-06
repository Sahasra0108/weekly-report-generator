from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Select, case, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Achievement, Blocker, HoursEntry, Project, Report, ReportStatus,
    ReportTask, ReportVersion, ReviewComment, Role, TaskStatus, User,
)
from app.schemas.dashboard import (
    ActivityItem, MemberStatus, ProjectWorkload, SectionEntry,
    SummaryMetrics, TrendPoint, WorkTypeHours,
)


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _team_member_ids(db: Session) -> list[int]:
    """Active users who are expected to file reports."""
    return list(
        db.scalars(
            select(User.id)
            .join(Role)
            .where(User.is_active.is_(True), Role.name == "MEMBER")
        )
    )


def _apply_scope(stmt: Select, project_id: int | None, user_id: int | None) -> Select:
    if project_id is not None:
        stmt = stmt.where(Report.project_id == project_id)
    if user_id is not None:
        stmt = stmt.where(Report.user_id == user_id)
    return stmt


def summary_metrics(
    db: Session,
    week_start: date | None = None,
    project_id: int | None = None,
) -> SummaryMetrics:
    week = week_start or monday_of(date.today())
    member_ids = _team_member_ids(db)

    # One grouped query rather than four counts
    stmt = (
        select(Report.status, func.count(Report.id))
        .where(Report.week_start_date == week, Report.user_id.in_(member_ids))
        .group_by(Report.status)
    )
    stmt = _apply_scope(stmt, project_id, None)
    counts = {status: count for status, count in db.execute(stmt).all()}

    submitted = counts.get(ReportStatus.SUBMITTED, 0)
    approved = counts.get(ReportStatus.APPROVED, 0)
    needs_correction = counts.get(ReportStatus.NEEDS_CORRECTION, 0)
    draft = counts.get(ReportStatus.DRAFT, 0)

    total_members = len(member_ids)
    accounted = submitted + approved + needs_correction + draft
    not_started = max(0, total_members - accounted)

    # Compliance = anything that reached the manager, i.e. not draft and not missing
    compliant = submitted + approved + needs_correction
    compliance_rate = round(compliant / total_members * 100, 1) if total_members else 0.0

    blockers_stmt = (
        select(func.count(Blocker.id))
        .join(Report, Blocker.report_id == Report.id)
        .where(
            Blocker.is_resolved.is_(False),
            Report.week_start_date == week,
            Report.status != ReportStatus.DRAFT,
        )
    )
    blockers_stmt = _apply_scope(blockers_stmt, project_id, None)
    open_blockers = db.scalar(blockers_stmt) or 0

    return SummaryMetrics(
        week_start_date=week,
        total_team_members=total_members,
        reports_submitted=submitted,
        reports_approved=approved,
        reports_needs_correction=needs_correction,
        reports_draft=draft,
        reports_not_started=not_started,
        compliance_rate=compliance_rate,
        open_blockers=open_blockers,
    )


def tasks_trend(
    db: Session,
    weeks: int = 8,
    user_id: int | None = None,
    project_id: int | None = None,
) -> list[TrendPoint]:
    """Completed vs total tasks per week, plus report volume."""
    earliest = monday_of(date.today()) - timedelta(weeks=weeks - 1)

    stmt = (
        select(
            Report.week_start_date,
            func.sum(case((ReportTask.status == TaskStatus.COMPLETED, 1), else_=0)),
            func.count(ReportTask.id),
            func.count(func.distinct(Report.id)),
        )
        .join(ReportTask, ReportTask.report_id == Report.id)
        .where(
            Report.week_start_date >= earliest,
            Report.status != ReportStatus.DRAFT,
        )
        .group_by(Report.week_start_date)
        .order_by(Report.week_start_date)
    )
    stmt = _apply_scope(stmt, project_id, user_id)

    rows = {
        week: TrendPoint(
            week_start_date=week,
            tasks_completed=int(completed or 0),
            total_tasks=int(total or 0),
            reports_submitted=int(reports or 0),
        )
        for week, completed, total, reports in db.execute(stmt).all()
    }

    # Fill gaps so the chart has a continuous x-axis
    result = []
    for i in range(weeks):
        week = earliest + timedelta(weeks=i)
        result.append(
            rows.get(
                week,
                TrendPoint(week_start_date=week, tasks_completed=0, total_tasks=0, reports_submitted=0),
            )
        )
    return result


def member_statuses(
    db: Session,
    week_start: date | None = None,
) -> list[MemberStatus]:
    """Every team member's submission state for the week, including those who haven't started."""
    week = week_start or monday_of(date.today())

    members = list(
        db.scalars(
            select(User)
            .join(Role)
            .where(User.is_active.is_(True), Role.name == "MEMBER")
            .order_by(User.full_name)
        )
    )

    reports = {
        report.user_id: report
        for report in db.scalars(
            select(Report)
            .options(selectinload(Report.tasks), selectinload(Report.hours))
            .where(Report.week_start_date == week)
        )
    }

    result = []
    for member in members:
        report = reports.get(member.id)
        result.append(
            MemberStatus(
                user_id=member.id,
                full_name=member.full_name,
                job_title=member.job_title,
                status=report.status if report else None,
                report_id=report.id if report else None,
                submitted_at=report.submitted_at if report else None,
                task_count=len(report.tasks) if report else 0,
                total_hours=(
                    sum((h.hours for h in report.hours), Decimal("0")) if report else Decimal("0")
                ),
            )
        )
    return result


def project_workload(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[ProjectWorkload]:
    """Reports, tasks, and hours grouped by project."""
    hours_sub = (
        select(HoursEntry.report_id, func.sum(HoursEntry.hours).label("hours"))
        .group_by(HoursEntry.report_id)
        .subquery()
    )
    tasks_sub = (
        select(ReportTask.report_id, func.count(ReportTask.id).label("tasks"))
        .group_by(ReportTask.report_id)
        .subquery()
    )

    stmt = (
        select(
            Project.id,
            Project.name,
            Project.color,
            func.count(func.distinct(Report.id)),
            func.coalesce(func.sum(tasks_sub.c.tasks), 0),
            func.coalesce(func.sum(hours_sub.c.hours), 0),
        )
        .select_from(Report)
        .outerjoin(Project, Report.project_id == Project.id)
        .outerjoin(hours_sub, hours_sub.c.report_id == Report.id)
        .outerjoin(tasks_sub, tasks_sub.c.report_id == Report.id)
        .where(Report.status != ReportStatus.DRAFT)
        .group_by(Project.id, Project.name, Project.color)
        .order_by(func.count(func.distinct(Report.id)).desc())
    )

    if date_from is not None:
        stmt = stmt.where(Report.week_start_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Report.week_start_date <= date_to)

    return [
        ProjectWorkload(
            project_id=pid,
            project_name=name or "Unassigned",
            color=color,
            report_count=int(reports),
            task_count=int(tasks),
            total_hours=Decimal(str(hours)),
        )
        for pid, name, color, reports, tasks, hours in db.execute(stmt).all()
    ]


def hours_by_work_type(
    db: Session,
    date_from: date | None = None,
    date_to: date | None = None,
    project_id: int | None = None,
) -> list[WorkTypeHours]:
    stmt = (
        select(HoursEntry.work_type, func.sum(HoursEntry.hours))
        .join(Report, HoursEntry.report_id == Report.id)
        .where(Report.status != ReportStatus.DRAFT)
        .group_by(HoursEntry.work_type)
    )

    if date_from is not None:
        stmt = stmt.where(Report.week_start_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Report.week_start_date <= date_to)
    stmt = _apply_scope(stmt, project_id, None)

    rows = db.execute(stmt).all()
    total = sum((Decimal(str(hours)) for _, hours in rows), Decimal("0"))

    return [
        WorkTypeHours(
            work_type=work_type.value,
            total_hours=Decimal(str(hours)),
            percentage=round(float(Decimal(str(hours)) / total * 100), 1) if total else 0.0,
        )
        for work_type, hours in sorted(rows, key=lambda r: r[1], reverse=True)
    ]


def recent_activity(db: Session, limit: int = 15) -> list[ActivityItem]:
    """Reviews and submissions interleaved, most recent first."""
    review_rows = db.execute(
        select(
            ReviewComment.id,
            ReviewComment.report_id,
            Report.week_start_date,
            ReviewComment.action,
            ReviewComment.comment,
            ReviewComment.created_at,
        )
        .join(Report, ReviewComment.report_id == Report.id)
        .order_by(ReviewComment.created_at.desc())
        .limit(limit)
    ).all()

    reviewer_names = {
        rc.id: (rc.reviewer.full_name if rc.reviewer else "Unknown")
        for rc in db.scalars(
            select(ReviewComment)
            .options(selectinload(ReviewComment.reviewer))
            .where(ReviewComment.id.in_([r[0] for r in review_rows] or [0]))
        )
    }

    author_names = dict(
        db.execute(
            select(Report.id, User.full_name)
            .join(User, Report.user_id == User.id)
            .where(Report.id.in_([r[1] for r in review_rows] or [0]))
        ).all()
    )

    items = [
        ActivityItem(
            id=rid,
            report_id=report_id,
            week_start_date=week,
            action=action,
            comment=comment,
            actor_name=reviewer_names.get(rid, "Unknown"),
            author_name=author_names.get(report_id, "Unknown"),
            occurred_at=created_at,
        )
        for rid, report_id, week, action, comment, created_at in review_rows
    ]

    submission_rows = db.execute(
        select(
            ReportVersion.id,
            ReportVersion.report_id,
            Report.week_start_date,
            ReportVersion.submitted_at,
            User.full_name,
        )
        .join(Report, ReportVersion.report_id == Report.id)
        .join(User, Report.user_id == User.id)
        .order_by(ReportVersion.submitted_at.desc())
        .limit(limit)
    ).all()

    items.extend(
        ActivityItem(
            id=vid,
            report_id=report_id,
            week_start_date=week,
            action=None,
            comment=None,
            actor_name=name,
            author_name=name,
            occurred_at=submitted_at,
        )
        for vid, report_id, week, submitted_at, name in submission_rows
    )

    items.sort(key=lambda i: i.occurred_at, reverse=True)
    return items[:limit]


def section_across_team(
    db: Session,
    section: str,
    week_start: date | None = None,
) -> list[SectionEntry]:
    """Bonus view: one section of every member's report, side by side."""
    week = week_start or monday_of(date.today())

    members = list(
        db.scalars(
            select(User)
            .join(Role)
            .where(User.is_active.is_(True), Role.name == "MEMBER")
            .order_by(User.full_name)
        )
    )

    loader = selectinload(Report.blockers) if section == "blockers" else selectinload(Report.achievements)
    reports = {
        report.user_id: report
        for report in db.scalars(
            select(Report)
            .options(loader)
            .where(
                Report.week_start_date == week,
                Report.status != ReportStatus.DRAFT,
            )
        )
    }

    result = []
    for member in members:
        report = reports.get(member.id)
        items: list[str] = []
        key_item: str | None = None

        if report is not None:
            rows = report.blockers if section == "blockers" else report.achievements
            items = [r.description for r in rows]
            flag = "is_key_issue" if section == "blockers" else "is_key_achievement"
            key_item = next((r.description for r in rows if getattr(r, flag)), None)

        result.append(
            SectionEntry(
                user_id=member.id,
                full_name=member.full_name,
                report_id=report.id if report else None,
                status=report.status if report else None,
                items=items,
                key_item=key_item,
            )
        )
    return result