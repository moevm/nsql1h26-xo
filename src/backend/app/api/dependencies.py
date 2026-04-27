from __future__ import annotations

from typing import Any

import secrets
from fastapi import Header, HTTPException

TOKENS: dict[str, dict[str, Any]] = {}


def create_token(user: dict[str, Any]) -> str:
    token = secrets.token_hex(24)
    TOKENS[token] = user
    return token


def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Требуется вход в систему")

    token = authorization.removeprefix("Bearer ").strip()
    user = TOKENS.get(token)

    if not user:
        raise HTTPException(status_code=401, detail="Сессия не найдена или истекла")

    return user
