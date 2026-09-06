from datetime import date

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession, ManagerUser
from app.models.enums import ReportStatus
from app.schemas.report import (
    PaginatedReports, ReportCreate, ReportDetail, ReportSummary,
    ReportUpdate, ReviewRequest, VersionBrief, VersionRead,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


def _to_detail(report, viewer) -> ReportDetail:
    detail = ReportDetail.model_validate(report)
    detail.is_editable = (
        report.user_id == viewer.id
        and report.status in report_service.EDITABLE_STATUSES
    )
    return detail


@router.get("", response_model=PaginatedReports)
def list_reports(
    db: DbSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: int | None = None,
    project_id: int | None = None,
    report_status: ReportStatus | None = Query(None, alias="status"),
    week_start: date | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    reports, total = report_service.list_reports(
        db, current_user,
        page=page, page_size=page_size, user_id=user_id, project_id=project_id,
        report_status=report_status, week_start=week_start,
        date_from=date_from, date_to=date_to,
    )

    items = []
    for report in reports:
        summary = ReportSummary.model_validate(report)
        for field, value in report_service.to_summary_fields(report).items():
            setattr(summary, field, value)
        items.append(summary)

    return PaginatedReports(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, -(-total // page_size)),
    )


@router.post("", response_model=ReportDetail, status_code=status.HTTP_201_CREATED)
def create_report(data: ReportCreate, db: DbSession, current_user: CurrentUser):
    report = report_service.create_report(db, data, current_user)
    return _to_detail(report, current_user)


@router.get("/{report_id}", response_model=ReportDetail)
def get_report(report_id: int, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    return _to_detail(report, current_user)


@router.put("/{report_id}", response_model=ReportDetail)
def update_report(report_id: int, data: ReportUpdate, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    updated = report_service.update_report(db, report, data, current_user)
    return _to_detail(updated, current_user)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    report_service.delete_report(db, report, current_user)


@router.post("/{report_id}/submit", response_model=ReportDetail)
def submit_report(report_id: int, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    updated = report_service.submit_report(db, report, current_user)
    return _to_detail(updated, current_user)


@router.post("/{report_id}/review", response_model=ReportDetail)
def review_report(
    report_id: int, data: ReviewRequest, db: DbSession, current_user: ManagerUser
):
    report = report_service.get_for_user(db, report_id, current_user)
    updated = report_service.review_report(db, report, data, current_user)
    return _to_detail(updated, current_user)


@router.get("/{report_id}/versions", response_model=list[VersionBrief])
def list_versions(report_id: int, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    return report_service.get_versions(db, report)


@router.get("/{report_id}/versions/{version_no}", response_model=VersionRead)
def get_version(report_id: int, version_no: int, db: DbSession, current_user: CurrentUser):
    report = report_service.get_for_user(db, report_id, current_user)
    return report_service.get_version(db, report, version_no)