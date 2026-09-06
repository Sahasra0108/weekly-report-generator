from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Project, User
from app.schemas.project import ProjectCreate, ProjectUpdate


def _base_query():
    return select(Project).options(selectinload(Project.members))


def get_by_id(db: Session, project_id: int) -> Project:
    project = db.scalar(_base_query().where(Project.id == project_id))
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


def list_projects(db: Session, include_inactive: bool = False) -> list[Project]:
    stmt = _base_query().order_by(Project.name)
    if not include_inactive:
        stmt = stmt.where(Project.is_active.is_(True))
    return list(db.scalars(stmt))


def _resolve_members(db: Session, member_ids: list[int]) -> list[User]:
    if not member_ids:
        return []
    users = list(db.scalars(select(User).where(User.id.in_(member_ids))))
    if len(users) != len(set(member_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more member ids are invalid",
        )
    return users


def create_project(db: Session, data: ProjectCreate, created_by: User) -> Project:
    if db.scalar(select(Project).where(Project.name == data.name)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this name already exists",
        )

    project = Project(
        name=data.name,
        description=data.description,
        color=data.color,
        created_by_id=created_by.id,
        members=_resolve_members(db, data.member_ids),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project: Project, data: ProjectUpdate) -> Project:
    payload = data.model_dump(exclude_unset=True)
    member_ids = payload.pop("member_ids", None)

    if "name" in payload:
        clash = db.scalar(
            select(Project).where(Project.name == payload["name"], Project.id != project.id)
        )
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A project with this name already exists",
            )

    for field, value in payload.items():
        setattr(project, field, value)

    if member_ids is not None:
        project.members = _resolve_members(db, member_ids)

    db.commit()
    db.refresh(project)
    return project


def archive_project(db: Session, project: Project) -> None:
    """Soft delete. Reports reference projects historically, so we never hard-delete."""
    project.is_active = False
    db.commit()