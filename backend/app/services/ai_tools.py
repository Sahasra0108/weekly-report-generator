from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Report, ReportStatus, Role, User
from app.services import dashboard_service


def _monday(offset_weeks: int = 0) -> date:
    today = date.today()
    return today - timedelta(days=today.weekday()) - timedelta(weeks=offset_weeks)


def _resolve_week(week_start: str | None) -> date:
    if not week_start:
        return _monday()
    try:
        parsed = date.fromisoformat(week_start)
    except ValueError:
        return _monday()
    # Snap to Monday - the model sometimes offers a mid-week date.
    return parsed - timedelta(days=parsed.weekday())


# ---------- tool implementations ----------

def get_team_summary(db: Session, user: User, week_start: str | None = None) -> dict:
    """Submission counts, compliance, and open blockers for one week."""
    week = _resolve_week(week_start)
    metrics = dashboard_service.summary_metrics(db, week)
    return {
        "week_starting": metrics.week_start_date.isoformat(),
        "team_size": metrics.total_team_members,
        "awaiting_review": metrics.reports_submitted,
        "approved": metrics.reports_approved,
        "needs_correction": metrics.reports_needs_correction,
        "not_started": metrics.reports_not_started,
        "compliance_rate_percent": metrics.compliance_rate,
        "open_blockers": metrics.open_blockers,
    }


def get_member_activity(
    db: Session, user: User, week_start: str | None = None
) -> dict:
    """Per-person status, task count and hours for one week."""
    week = _resolve_week(week_start)
    members = dashboard_service.member_statuses(db, week)
    return {
        "week_starting": week.isoformat(),
        "members": [
            {
                "name": m.full_name,
                "job_title": m.job_title,
                "report_status": m.status.value if m.status else "NOT_STARTED",
                "tasks": m.task_count,
                "hours_logged": float(m.total_hours),
            }
            for m in members
        ],
    }


def get_report_details(
    db: Session,
    user: User,
    week_start: str | None = None,
    member_name: str | None = None,
) -> dict:
    """Full report content for a week, optionally narrowed to one person."""
    week = _resolve_week(week_start)

    stmt = (
        select(Report)
        .options(
            selectinload(Report.author),
            selectinload(Report.project),
            selectinload(Report.tasks),
            selectinload(Report.blockers),
            selectinload(Report.achievements),
            selectinload(Report.hours),
        )
        .where(
            Report.week_start_date == week,
            Report.status != ReportStatus.DRAFT,  # drafts are private to their author
        )
    )

    if member_name:
        stmt = stmt.join(User, Report.user_id == User.id).where(
            User.full_name.ilike(f"%{member_name}%")
        )

    reports = list(db.scalars(stmt))

    return {
        "week_starting": week.isoformat(),
        "report_count": len(reports),
        "reports": [
            {
                "author": r.author.full_name,
                "project": r.project.name if r.project else None,
                "status": r.status.value,
                "tasks": [
                    {
                        "name": t.task_name,
                        "status": t.status.value,
                        "priority": t.priority.value,
                        "completion_percent": t.actual_percent,
                        "hours_spent": float(t.hours_spent),
                        "output": t.output,
                    }
                    for t in r.tasks
                ],
                "blockers": [
                    {
                        "description": b.description,
                        "is_key_issue": b.is_key_issue,
                        "resolved": b.is_resolved,
                    }
                    for b in r.blockers
                ],
                "achievements": [a.description for a in r.achievements],
                "hours_by_type": {
                    h.work_type.value: float(h.hours) for h in r.hours
                },
                "notes": r.notes,
            }
            for r in reports
        ],
    }


def get_workload_breakdown(db: Session, user: User) -> dict:
    """Hours by project and by task type, across all submitted reports."""
    projects = dashboard_service.project_workload(db)
    work_types = dashboard_service.hours_by_work_type(db)
    return {
        "by_project": [
            {
                "project": p.project_name,
                "reports": p.report_count,
                "tasks": p.task_count,
                "hours": float(p.total_hours),
            }
            for p in projects
        ],
        "by_task_type": [
            {
                "task_type": w.work_type,
                "hours": float(w.total_hours),
                "percentage": w.percentage,
            }
            for w in work_types
        ],
    }


def get_recent_trend(db: Session, user: User, weeks: int = 8) -> dict:
    """Task completion and submission volume over recent weeks."""
    weeks = max(1, min(int(weeks), 26))
    points = dashboard_service.tasks_trend(db, weeks)
    return {
        "weeks": [
            {
                "week_starting": p.week_start_date.isoformat(),
                "tasks_completed": p.tasks_completed,
                "tasks_total": p.total_tasks,
                "reports_submitted": p.reports_submitted,
            }
            for p in points
        ]
    }


# ---------- registry ----------

TOOL_FUNCTIONS: dict[str, Callable[..., dict]] = {
    "get_team_summary": get_team_summary,
    "get_member_activity": get_member_activity,
    "get_report_details": get_report_details,
    "get_workload_breakdown": get_workload_breakdown,
    "get_recent_trend": get_recent_trend,
}

# Schemas sent to the model. Descriptions matter - they're how the model
# decides which tool answers the question.
TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "get_team_summary",
        "description": (
            "High-level numbers for one week: how many reports were submitted, "
            "approved, sent back for correction, or never started, plus the "
            "compliance rate and how many blockers are open. Use this for "
            "questions about overall team status or who has not reported."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "week_start": {
                    "type": "string",
                    "description": "Monday of the week, as YYYY-MM-DD. Omit for the current week.",
                }
            },
        },
    },
    {
        "name": "get_member_activity",
        "description": (
            "Each team member's report status, task count and hours logged for "
            "one week. Use this to compare people or find who is behind."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "week_start": {
                    "type": "string",
                    "description": "Monday of the week, as YYYY-MM-DD. Omit for the current week.",
                }
            },
        },
    },
    {
        "name": "get_report_details",
        "description": (
            "The full contents of reports for a week: tasks, blockers, "
            "achievements, hours and notes. Use this when asked what people "
            "actually worked on, what is blocking them, or what was achieved."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "week_start": {
                    "type": "string",
                    "description": "Monday of the week, as YYYY-MM-DD. Omit for the current week.",
                },
                "member_name": {
                    "type": "string",
                    "description": "Optional. Narrows results to one person by name.",
                },
            },
        },
    },
    {
        "name": "get_workload_breakdown",
        "description": (
            "How hours are distributed across projects and across task types "
            "such as development, testing and meetings, over all submitted "
            "reports. Use this for questions about workload balance."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_recent_trend",
        "description": (
            "Task completion and report volume week by week over recent weeks. "
            "Use this for questions about trends or whether things are improving."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "weeks": {
                    "type": "integer",
                    "description": "How many weeks back to include. Defaults to 8.",
                }
            },
        },
    },
]