"""Seed the database with demo users, projects, and reports.

Run with:  python -m app.db.seed
Add --reset to wipe existing data first.
"""

from __future__ import annotations

import argparse
import random
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Achievement,
    Blocker,
    HoursEntry,
    PlannedTask,
    Project,
    Report,
    ReportStatus,
    ReportTask,
    ReportVersion,
    ReviewAction,
    ReviewComment,
    Role,
    TaskPriority,
    TaskStatus,
    User,
    WorkType,
    project_members,
)

DEMO_PASSWORD = "Password123!"
WEEKS_OF_HISTORY = 6

ROLES = [
    ("ADMIN", "Full system access including user management"),
    ("MANAGER", "Reviews team reports and views the team dashboard"),
    ("MEMBER", "Creates and submits their own weekly reports"),
]

USERS = [
    ("admin@example.com", "Priya Fernando", "Engineering Director", "ADMIN"),
    ("manager@example.com", "Dinuka Perera", "Engineering Manager", "MANAGER"),
    ("nimal@example.com", "Nimal Jayasinghe", "Senior Software Engineer", "MEMBER"),
    ("kavya@example.com", "Kavya Rathnayake", "Software Engineer", "MEMBER"),
    ("tharindu@example.com", "Tharindu Silva", "QA Engineer", "MEMBER"),
    ("amaya@example.com", "Amaya Wickramasinghe", "Frontend Engineer", "MEMBER"),
]

PROJECTS = [
    ("Client A - Portal Rebuild", "Customer-facing portal rewrite", "#2563eb"),
    ("Internal Tooling", "Developer productivity and internal systems", "#16a34a"),
    ("R&D", "Prototypes and technical exploration", "#9333ea"),
    ("Marketing Site", "Public website and campaign pages", "#ea580c"),
]

TASK_NAMES = [
    "Implement report submission endpoint",
    "Refactor authentication middleware",
    "Fix pagination bug on dashboard",
    "Write integration tests for review flow",
    "Migrate legacy user table",
    "Build chart components for insights page",
    "Code review for payments module",
    "Update API documentation",
    "Optimise slow dashboard query",
    "Set up CI pipeline for staging",
    "Design tokens for the component library",
    "Investigate memory leak in worker process",
]

OUTPUTS = [
    "Merged PR #142",
    "Deployed to staging",
    "Draft PR opened, awaiting review",
    "Documentation page published",
    "Test suite added, 14 new cases",
    "Spike write-up shared with the team",
]

BLOCKER_TEXTS = [
    "Waiting on API credentials from the client's IT team",
    "Staging environment was down for two days",
    "Requirements for the export feature are still ambiguous",
    "Blocked on design sign-off for the settings page",
    "Flaky test suite is slowing down the release",
    "Dependency upgrade broke the build on Windows",
]

ACHIEVEMENT_TEXTS = [
    "Cut dashboard load time from 4s to under 1s",
    "Shipped the review workflow ahead of schedule",
    "Onboarded a new team member onto the codebase",
    "Reduced flaky test failures by 80 percent",
    "Automated the weekly deployment checklist",
    "Closed out all outstanding critical bugs",
]

PLANNED_TEXTS = [
    "Start work on the notification service",
    "Finish the remaining dashboard filters",
    "Pair with QA on the regression suite",
    "Draft the technical design for version history",
    "Clear the backlog of small UI fixes",
    "Set up monitoring for the staging environment",
]

REVIEW_COMMENTS = [
    "Tasks look good, but the hours breakdown doesn't add up to the total. Please correct.",
    "Please add more detail on the blocker - what specifically is needed to unblock this?",
    "The planned percentages are missing for two tasks. Fill those in and resubmit.",
    "Good report overall. Could you flag which achievement was the key one for the week?",
]


def monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def reset(db: Session) -> None:
    """Delete all data in dependency order."""
    for model in (
        ReviewComment, ReportVersion, HoursEntry, Achievement,
        Blocker, PlannedTask, ReportTask, Report,
    ):
        db.execute(delete(model))
    db.execute(delete(project_members))
    db.execute(delete(Project))
    db.execute(delete(User))
    db.execute(delete(Role))
    db.commit()
    print("Cleared existing data.")


def seed_roles(db: Session) -> dict[str, Role]:
    roles: dict[str, Role] = {}
    for name, description in ROLES:
        role = db.scalar(select(Role).where(Role.name == name))
        if role is None:
            role = Role(name=name, description=description)
            db.add(role)
        roles[name] = role
    db.flush()
    print(f"Seeded {len(roles)} roles.")
    return roles


def seed_users(db: Session, roles: dict[str, Role]) -> list[User]:
    users: list[User] = []
    for email, full_name, job_title, role_name in USERS:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                full_name=full_name,
                job_title=job_title,
                hashed_password=hash_password(DEMO_PASSWORD),
                role=roles[role_name],
                is_active=True,
            )
            db.add(user)
        users.append(user)
    db.flush()
    print(f"Seeded {len(users)} users (password for all: {DEMO_PASSWORD}).")
    return users


def seed_projects(db: Session, admin: User, members: list[User]) -> list[Project]:
    projects: list[Project] = []
    for name, description, color in PROJECTS:
        project = db.scalar(select(Project).where(Project.name == name))
        if project is None:
            project = Project(
                name=name,
                description=description,
                color=color,
                created_by_id=admin.id,
            )
            db.add(project)
        projects.append(project)
    db.flush()

    for project in projects:
        if not project.members:
            project.members = random.sample(members, k=random.randint(2, len(members)))
    db.flush()
    print(f"Seeded {len(projects)} projects.")
    return projects


def build_report(
    db: Session,
    author: User,
    project: Project,
    week_start: date,
    status: ReportStatus,
) -> Report:
    report = Report(
        user_id=author.id,
        project_id=project.id,
        week_start_date=week_start,
        week_end_date=week_start + timedelta(days=4),
        status=status,
        notes=random.choice([None, "Shorter week due to a public holiday.", "Pairing sessions took up more time than planned."]),
        links=random.choice([None, "https://github.com/example/repo/pull/142"]),
    )
    db.add(report)
    db.flush()

    # Completed tasks
    for i, task_name in enumerate(random.sample(TASK_NAMES, k=random.randint(3, 5))):
        planned = random.choice([50, 75, 100])
        actual = max(0, min(100, planned + random.choice([-30, -15, 0, 0, 10])))
        hours_planned = Decimal(random.choice(["4.00", "6.00", "8.00", "12.00"]))
        drift = Decimal(random.choice(["-2.00", "-1.00", "0.00", "1.50", "3.00"]))
        db.add(
            ReportTask(
                report_id=report.id,
                task_name=task_name,
                priority=random.choice(list(TaskPriority)),
                status=(
                    TaskStatus.COMPLETED if actual == 100
                    else random.choice([TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.CARRIED_OVER])
                ),
                planned_percent=planned,
                actual_percent=actual,
                hours_planned=hours_planned,
                hours_spent=max(Decimal("0.50"), hours_planned + drift),
                output=random.choice(OUTPUTS),
                sort_order=i,
            )
        )

    # Next week's plan
    for i, text in enumerate(random.sample(PLANNED_TEXTS, k=random.randint(2, 3))):
        db.add(
            PlannedTask(
                report_id=report.id,
                description=text,
                priority=random.choice(list(TaskPriority)),
                sort_order=i,
            )
        )

    # Blockers - roughly two thirds of reports have at least one
    if random.random() < 0.65:
        texts = random.sample(BLOCKER_TEXTS, k=random.randint(1, 2))
        for i, text in enumerate(texts):
            db.add(
                Blocker(
                    report_id=report.id,
                    description=text,
                    is_key_issue=(i == 0),
                    is_resolved=random.random() < 0.3,
                    sort_order=i,
                )
            )

    # Achievements
    for i, text in enumerate(random.sample(ACHIEVEMENT_TEXTS, k=random.randint(1, 2))):
        db.add(
            Achievement(
                report_id=report.id,
                description=text,
                is_key_achievement=(i == 0),
                sort_order=i,
            )
        )

    # Hours by work type - should total roughly a working week
    remaining = Decimal(random.choice(["36.00", "38.00", "40.00", "42.00"]))
    types = [WorkType.DEVELOPMENT, WorkType.TESTING, WorkType.MEETINGS, WorkType.DOCUMENTATION]
    for i, work_type in enumerate(types):
        if i == len(types) - 1:
            hours = remaining
        else:
            share = Decimal(str(round(float(remaining) * random.uniform(0.15, 0.45), 2)))
            hours = min(share, remaining - Decimal("1.00"))
            remaining -= hours
        db.add(HoursEntry(report_id=report.id, work_type=work_type, hours=hours))

    db.flush()
    return report


def snapshot_of(report: Report) -> dict:
    """Serialize a report's current content for version history."""
    return {
        "week_start_date": report.week_start_date.isoformat(),
        "week_end_date": report.week_end_date.isoformat(),
        "project_id": report.project_id,
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
            {"description": b.description, "is_key_issue": b.is_key_issue, "is_resolved": b.is_resolved}
            for b in report.blockers
        ],
        "achievements": [
            {"description": a.description, "is_key_achievement": a.is_key_achievement}
            for a in report.achievements
        ],
        "hours": [{"work_type": h.work_type.value, "hours": str(h.hours)} for h in report.hours],
    }


def add_version(db: Session, report: Report, submitted_at: datetime) -> ReportVersion:
    report.current_version_no += 1
    version = ReportVersion(
        report_id=report.id,
        version_no=report.current_version_no,
        snapshot=snapshot_of(report),
        submitted_at=submitted_at,
        submitted_by_id=report.user_id,
    )
    db.add(version)
    db.flush()
    return version


def seed_reports(db: Session, members: list[User], manager: User, projects: list[Project]) -> None:
    this_monday = monday_of(date.today())
    created = 0

    for week_offset in range(WEEKS_OF_HISTORY, 0, -1):
        week_start = this_monday - timedelta(weeks=week_offset)
        is_recent = week_offset <= 2

        for member in members:
            # Leave a couple of gaps so "not yet started" is visible on the dashboard
            if is_recent and random.random() < 0.2:
                continue

            if week_offset > 2:
                status = ReportStatus.APPROVED
            elif week_offset == 2:
                status = random.choice(
                    [ReportStatus.APPROVED, ReportStatus.APPROVED, ReportStatus.NEEDS_CORRECTION]
                )
            else:
                status = random.choice(
                    [ReportStatus.SUBMITTED, ReportStatus.SUBMITTED, ReportStatus.DRAFT, ReportStatus.NEEDS_CORRECTION]
                )

            report = build_report(db, member, random.choice(projects), week_start, status)
            submitted_at = datetime.combine(week_start + timedelta(days=4), datetime.min.time()) + timedelta(hours=17)

            if status is ReportStatus.DRAFT:
                created += 1
                continue

            # Every non-draft report has at least one submitted version
            version = add_version(db, report, submitted_at)
            report.submitted_at = submitted_at

            if status is ReportStatus.NEEDS_CORRECTION:
                db.add(
                    ReviewComment(
                        report_id=report.id,
                        version_id=version.id,
                        reviewer_id=manager.id,
                        action=ReviewAction.REQUESTED_CHANGES,
                        comment=random.choice(REVIEW_COMMENTS),
                        created_at=submitted_at + timedelta(days=1),
                    )
                )
                report.reviewed_at = submitted_at + timedelta(days=1)
                report.reviewed_by_id = manager.id

            elif status is ReportStatus.APPROVED:
                # About a third of approved reports went through a correction cycle first,
                # so version history has something to show.
                if random.random() < 0.35:
                    db.add(
                        ReviewComment(
                            report_id=report.id,
                            version_id=version.id,
                            reviewer_id=manager.id,
                            action=ReviewAction.REQUESTED_CHANGES,
                            comment=random.choice(REVIEW_COMMENTS),
                            created_at=submitted_at + timedelta(days=1),
                        )
                    )
                    resubmitted_at = submitted_at + timedelta(days=2)
                    version = add_version(db, report, resubmitted_at)
                    report.submitted_at = resubmitted_at
                    approved_at = resubmitted_at + timedelta(days=1)
                else:
                    approved_at = submitted_at + timedelta(days=1)

                db.add(
                    ReviewComment(
                        report_id=report.id,
                        version_id=version.id,
                        reviewer_id=manager.id,
                        action=ReviewAction.APPROVED,
                        comment=random.choice([None, "Looks good, thanks.", "Nice work this week."]),
                        created_at=approved_at,
                    )
                )
                report.reviewed_at = approved_at
                report.reviewed_by_id = manager.id

            created += 1

    db.commit()
    print(f"Seeded {created} reports across {WEEKS_OF_HISTORY} weeks.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the weekly reports database.")
    parser.add_argument("--reset", action="store_true", help="Delete all existing data first")
    args = parser.parse_args()

    random.seed(42)  # reproducible demo data

    db = SessionLocal()
    try:
        if args.reset:
            reset(db)

        roles = seed_roles(db)
        users = seed_users(db, roles)
        db.commit()

        admin = next(u for u in users if u.role.name == "ADMIN")
        manager = next(u for u in users if u.role.name == "MANAGER")
        members = [u for u in users if u.role.name == "MEMBER"]

        projects = seed_projects(db, admin, members)
        db.commit()

        existing = db.scalar(select(Report).limit(1))
        if existing is not None:
            print("Reports already exist - skipping. Use --reset to rebuild.")
        else:
            seed_reports(db, members, manager, projects)

        print("\nDone. Log in with any of:")
        for email, name, _, role_name in USERS:
            print(f"  {email:28} {role_name:8} {name}")
        print(f"\nPassword for all accounts: {DEMO_PASSWORD}")

    finally:
        db.close()


if __name__ == "__main__":
    main()