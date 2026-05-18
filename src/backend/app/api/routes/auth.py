from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.dependencies import create_token
from app.core.utils import now_iso
from app.db.connection import get_db
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_api(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }


@router.post("/login")
def auth_login(payload: LoginRequest) -> dict[str, Any]:
    db = get_db()
    user = db.users.find_one({"email": payload.email.strip().lower()})

    if not user or user.get("password") != payload.password:
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    api_user = _user_to_api(user)
    token = create_token(api_user)

    return {"token": token, "user": api_user}


@router.post("/register")
def auth_register(payload: RegisterRequest) -> dict[str, Any]:
    db = get_db()
    email = payload.email.strip().lower()

    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(status_code=400, detail="Неверный формат email")

    if db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не короче 6 символов")

    number = db.users.count_documents({}) + 1
    user = {
        "id": f"U-{number:03d}",
        "name": payload.name.strip(),
        "email": email,
        "password": payload.password,
        "role": "user",
        "created_at": now_iso(),
    }
    db.users.insert_one(user)
    api_user = _user_to_api(user)
    token = create_token(api_user)
    return {"token": token, "user": api_user, "message": "Регистрация выполнена"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, str]:
    # В прототипе письма реально не отправляются: endpoint фиксирует успешный сценарий без раскрытия, есть ли email в базе.
    return {"message": f"Если {payload.email} есть в системе, инструкции будут отправлены"}
