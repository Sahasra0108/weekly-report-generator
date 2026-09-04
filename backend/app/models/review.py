from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import ReviewAction

if TYPE_CHECKING:
    from app.models.report import Report
    from app.models.user import User


class ReportVersion(Base):
    __tablename__ = "report_versions"
    __table_args__ = (
        UniqueConstraint("report_id", "version_no", name="uq_version_report_no"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)

    snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    submitted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    report: Mapped["Report"] = relationship(back_populates="versions")
    submitted_by: Mapped["User | None"] = relationship()
    comments: Mapped[list["ReviewComment"]] = relationship(back_populates="version")

    def __repr__(self) -> str:
        return f"<ReportVersion report={self.report_id} v{self.version_no}>"


class ReviewComment(Base):
    __tablename__ = "review_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_id: Mapped[int | None] = mapped_column(
        ForeignKey("report_versions.id", ondelete="SET NULL"), index=True
    )
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    action: Mapped[ReviewAction] = mapped_column(
        Enum(ReviewAction, native_enum=False, length=30), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    report: Mapped["Report"] = relationship(back_populates="review_comments")
    version: Mapped["ReportVersion | None"] = relationship(back_populates="comments")
    reviewer: Mapped["User | None"] = relationship()