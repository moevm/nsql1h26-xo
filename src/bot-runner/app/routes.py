from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.executor import run_python_bot
from app.schemas import RunRequest, RunResponse

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/run", response_model=RunResponse)
def run_bot(payload: RunRequest) -> RunResponse:
    try:
        return run_python_bot(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"runner error: {exc}") from exc
