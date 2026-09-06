from fastapi import APIRouter, status

from app.core.deps import AdminUser, CurrentUser, DbSession, ManagerUser
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
def list_projects(db: DbSession, current_user: CurrentUser, include_inactive: bool = False):
    """Everyone needs the project list to tag their reports."""
    return project_service.list_projects(db, include_inactive=include_inactive)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: DbSession, current_user: ManagerUser):
    return project_service.create_project(db, data, created_by=current_user)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: DbSession, current_user: CurrentUser):
    return project_service.get_by_id(db, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: int, data: ProjectUpdate, db: DbSession, current_user: ManagerUser):
    project = project_service.get_by_id(db, project_id)
    return project_service.update_project(db, project, data)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_project(project_id: int, db: DbSession, current_user: AdminUser):
    project = project_service.get_by_id(db, project_id)
    project_service.archive_project(db, project)