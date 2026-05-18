from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RunRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=256_000)
    state: dict[str, Any] = Field(default_factory=dict)
    timeout_ms: int = Field(default=3000, ge=100, le=5000)
    memory_limit_mb: int = Field(default=128, ge=32, le=256)


class RunResponse(BaseModel):
    ok: bool
    move: dict[str, int] | None = None
    stdout: str = ""
    stderr: str = ""
    error: str | None = None
    duration_ms: int
