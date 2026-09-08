from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey, Integer,
    Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin
from app.models.enums import ReportStatus, TaskPriority, TaskStatus, WorkType

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.review import ReportVersion, ReviewComment
    from app.models.user import User


class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("user_id", "week_start_date", name="uq_report_user_week"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), index=True
    )

    week_start_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    week_end_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, native_enum=False, length=20),
        default=ReportStatus.DRAFT,
        nullable=False,
        index=True,
    )
    current_version_no: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text)
    links: Mapped[str | None] = mapped_column(Text)

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    author: Mapped["User"] = relationship(back_populates="reports", foreign_keys=[user_id])
    reviewer: Mapped["User | None"] = relationship(foreign_keys=[reviewed_by_id])
    project: Mapped["Project | None"] = relationship(back_populates="reports")

    tasks: Mapped[list["ReportTask"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="ReportTask.sort_order"
    )
    planned_tasks: Mapped[list["PlannedTask"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="PlannedTask.sort_order"
    )
    blockers: Mapped[list["Blocker"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="Blocker.sort_order"
    )
    achievements: Mapped[list["Achievement"]] = relationship(
        back_populates="report", cascade="all, delete-orphan", order_by="Achievement.sort_order"
    )
    hours: Mapped[list["HoursEntry"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )
    versions: Mapped[list["ReportVersion"]] = relationship(
        back_populates="report", cascade="all, delete-orphan",
        order_by="ReportVersion.version_no",
    )
    review_comments: Mapped[list["ReviewComment"]] = relationship(
        back_populates="report", cascade="all, delete-orphan",
        order_by="ReviewComment.created_at",
    )

    @property
    def is_editable_by_author(self) -> bool:
        return self.status in (ReportStatus.DRAFT, ReportStatus.NEEDS_CORRECTION)

    def __repr__(self) -> str:
        return f"<Report user={self.user_id} week={self.week_start_date} {self.status}>"


class ReportTask(Base):
    __tablename__ = "report_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )

    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, native_enum=False, length=20),
        default=TaskPriority.MEDIUM, nullable=False,
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=20),
        default=TaskStatus.IN_PROGRESS, nullable=False,
    )
    planned_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    actual_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hours_planned: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    hours_spent: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    output: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="tasks")


class PlannedTask(Base):
    __tablename__ = "report_planned_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, native_enum=False, length=20),
        default=TaskPriority.MEDIUM, nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="planned_tasks")


class Blocker(Base):
    __tablename__ = "report_blockers"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_key_issue: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="blockers")


class Achievement(Base):
    __tablename__ = "report_achievements"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_key_achievement: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="achievements")


class HoursEntry(Base):
    __tablename__ = "report_hours"
    __table_args__ = (
        UniqueConstraint("report_id", "work_type", name="uq_hours_report_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    work_type: Mapped[WorkType] = mapped_column(
        Enum(WorkType, native_enum=False, length=20), nullable=False
    )
    hours: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0, nullable=False)

    report: Mapped["Report"] = relationship(back_populates="hours")