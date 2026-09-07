from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import User
from app.services.ai_tools import TOOL_FUNCTIONS, TOOL_SCHEMAS

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 4

SYSTEM_PROMPT = """You are an assistant inside a weekly reporting tool used by \
engineering managers. You help managers understand what their team worked on, \
who is blocked, and how workload is distributed.

Rules:
- Answer only from data returned by the tools. Never invent names, numbers, or events.
- If the tools return nothing for a period, say so plainly rather than guessing.
- Be concise. Two or three short paragraphs at most, or a short list.
- Use real names from the data when discussing individuals.
- Weeks run Monday to Friday. When someone says "last week" or "this week", \
work out the Monday and pass it to the tool.
- You may be asked to summarise. Highlight recurring blockers and any imbalance \
in workload, but do not speculate about causes you cannot see in the data.
- You cannot change any data. If asked to approve, edit, or submit a report, \
explain that this must be done in the application.

Today is {today}."""


def _require_manager(user: User) -> None:
    if user.role.name not in ("MANAGER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The assistant is available to managers only",
        )


def _client():
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI assistant is not configured on this server",
        )

    from google import genai

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _run_tool(db: Session, user: User, name: str, args: dict[str, Any]) -> dict:
    """Execute a tool the model asked for, after checking it exists."""
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        # The model hallucinated a tool. Tell it so rather than failing the request.
        return {"error": f"No such tool: {name}"}

    try:
        return fn(db, user, **args)
    except TypeError as exc:
        return {"error": f"Invalid arguments for {name}: {exc}"}
    except Exception:
        logger.exception("Tool %s failed", name)
        return {"error": f"{name} could not be completed"}


def ask(
    db: Session,
    user: User,
    question: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Answer a question about team activity, using tools to fetch real data."""
    _require_manager(user)

    from datetime import date

    from google.genai import types

    client = _client()

    contents: list[types.Content] = []
    for turn in (history or [])[-8:]:  # cap history so context stays small
        role = "user" if turn.get("role") == "user" else "model"
        contents.append(
            types.Content(role=role, parts=[types.Part(text=turn.get("content", ""))])
        )
    contents.append(types.Content(role="user", parts=[types.Part(text=question)]))

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT.format(today=date.today().isoformat()),
        tools=[types.Tool(function_declarations=TOOL_SCHEMAS)],
        temperature=0.2,  # factual questions, so keep it tight
    )

    tools_used: list[str] = []

    for _ in range(MAX_TOOL_ROUNDS):
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
        except Exception:
            logger.exception("Gemini request failed")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The assistant is temporarily unavailable",
            )

        candidate = response.candidates[0] if response.candidates else None
        if candidate is None or candidate.content is None:
            break

        calls = [p.function_call for p in (candidate.content.parts or []) if p.function_call]

        if not calls:
            text = "".join(p.text or "" for p in (candidate.content.parts or []))
            return {
                "answer": text.strip() or "I could not find an answer to that.",
                "tools_used": tools_used,
            }

        # Record what the model asked for, then answer each call.
        contents.append(candidate.content)

        tool_parts = []
        for call in calls:
            args = dict(call.args or {})
            tools_used.append(call.name)
            result = _run_tool(db, user, call.name, args)
            tool_parts.append(
                types.Part.from_function_response(name=call.name, response=result)
            )

        contents.append(types.Content(role="user", parts=tool_parts))

    return {
        "answer": (
            "I wasn't able to answer that within a reasonable number of steps. "
            "Try asking something more specific."
        ),
        "tools_used": tools_used,
    }


def weekly_summary(db: Session, user: User, week_start: str | None = None) -> dict:
    """A written summary of the week, for the dashboard."""
    _require_manager(user)
    question = (
        f"Summarise the team's week starting {week_start}. "
        if week_start
        else "Summarise the team's current week. "
    )
    question += (
        "Cover what was completed, any recurring blockers, and whether workload "
        "looks balanced across people. Keep it to three short paragraphs."
    )
    return ask(db, user, question)