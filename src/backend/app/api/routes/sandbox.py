from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.dependencies import current_user, require_moderator_or_admin
from app.services.sandbox import DEFAULT_STATE, get_runner_health, run_uploaded_bot

router = APIRouter(prefix="/sandbox", tags=["sandbox"])


class SandboxRunRequest(BaseModel):
    botId: str = Field(alias="botId")
    state: dict[str, Any] | None = None
    timeoutMs: int = Field(default=3000, ge=100, le=5000, alias="timeoutMs")
    memoryLimitMb: int = Field(default=128, ge=32, le=256, alias="memoryLimitMb")


@router.get("/health")
def sandbox_health(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Проверяет, доступен ли отдельный контейнер выполнения bot-runner."""
    return get_runner_health()


@router.get("/protocol")
def sandbox_protocol(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Возвращает протокол взаимодействия загруженного Python-бота с платформой."""
    return {
        "input": "бот получает JSON состояния партии через stdin",
        "output": "бот должен вывести в stdout JSON вида {\"x\": 1, \"y\": 2}",
        "exampleState": DEFAULT_STATE,
        "limits": {
            "timeoutMs": "100..5000",
            "memoryLimitMb": "32..256",
            "stdoutLimit": "4000 chars",
        },
    }


@router.post("/run")
def sandbox_run(payload: SandboxRunRequest, _: dict[str, Any] = Depends(require_moderator_or_admin)) -> dict[str, Any]:
    """Тестово запускает активную версию загруженного Python-бота в runner-контейнере."""
    return run_uploaded_bot(
        bot_id=payload.botId,
        state=payload.state,
        timeout_ms=payload.timeoutMs,
        memory_limit_mb=payload.memoryLimitMb,
    )
