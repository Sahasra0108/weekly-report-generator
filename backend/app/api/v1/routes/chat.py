from fastapi import APIRouter

from app.core.config import settings
from app.core.deps import DbSession, ManagerUser
from app.schemas.chat import AssistantStatus, ChatRequest, ChatResponse
from app.services import ai_service

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/status", response_model=AssistantStatus)
def status(current_user: ManagerUser):
    """Lets the UI hide the assistant when no key is configured."""
    configured = bool(settings.GEMINI_API_KEY)
    return AssistantStatus(
        available=configured,
        model=settings.GEMINI_MODEL if configured else None,
    )


@router.post("/chat", response_model=ChatResponse)
def chat(data: ChatRequest, db: DbSession, current_user: ManagerUser):
    result = ai_service.ask(
        db,
        current_user,
        data.question,
        history=[turn.model_dump() for turn in data.history],
    )
    return ChatResponse(**result)


@router.post("/summary", response_model=ChatResponse)
def summary(db: DbSession, current_user: ManagerUser, week_start: str | None = None):
    result = ai_service.weekly_summary(db, current_user, week_start)
    return ChatResponse(**result)