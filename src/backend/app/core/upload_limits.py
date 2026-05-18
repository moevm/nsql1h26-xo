from __future__ import annotations

import os

from fastapi import HTTPException, UploadFile

# Лимиты выбраны так, чтобы обычные .py-боты и небольшие архивы проходили,
# а слишком большие файлы не читались целиком в память backend.
MAX_BOT_UPLOAD_BYTES = int(os.getenv("MAX_BOT_UPLOAD_BYTES", str(5 * 1024 * 1024)))
MAX_IMPORT_UPLOAD_BYTES = int(os.getenv("MAX_IMPORT_UPLOAD_BYTES", str(20 * 1024 * 1024)))
READ_CHUNK_BYTES = 1024 * 1024


def format_bytes(value: int) -> str:
    if value >= 1024 * 1024:
        return f"{value / (1024 * 1024):.0f} МБ"
    if value >= 1024:
        return f"{value / 1024:.0f} КБ"
    return f"{value} байт"


async def read_upload_limited(file: UploadFile, *, max_bytes: int, label: str) -> bytes:
    """Читает UploadFile порциями и возвращает понятную 413-ошибку при превышении лимита."""
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(READ_CHUNK_BYTES)
        if not chunk:
            break

        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"{label} слишком большой. Максимальный размер: "
                    f"{format_bytes(max_bytes)}. Выбранный файл больше допустимого лимита."
                ),
            )

        chunks.append(chunk)

    return b"".join(chunks)
