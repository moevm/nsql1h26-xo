from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.dependencies import create_token
from app.db.connection import get_db
from app.schemas.auth import LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def auth_login(payload: LoginRequest) -> dict[str, Any]:
    db = get_db()
    user = db.users.find_one({"email": payload.email})

    if not user or user.get("password") != payload.password:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    api_user = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }
    token = create_token(api_user)

    return {"token": token, "user": api_user}
