from __future__ import annotations

import csv
import io
import json
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel

from app.api.dependencies import require_moderator_or_admin
from app.core.utils import now_iso
from app.core.upload_limits import MAX_IMPORT_UPLOAD_BYTES, read_upload_limited
from app.db.connection import get_db

router = APIRouter(prefix="/import-export", tags=["import-export"])

COLLECTIONS = [
    "users",
    "bots",
    "bot_versions",
    "bot_stats",
    "matches",
    "match_events",
    "reports",
    "import_export_history",
    "app_settings",
]


class ExportPayload(BaseModel):
    entity: str = "Все данные"
    format: str = "JSON"
    includeNested: bool = True
    filters: dict[str, str] = {}


def _json_safe(value: Any) -> Any:
    if isinstance(value, bytes):
        return {"$binaryHex": value.hex()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items() if key != "_id"}
    return value


def _restore_value(value: Any) -> Any:
    if isinstance(value, dict) and set(value.keys()) == {"$binaryHex"}:
        return bytes.fromhex(str(value["$binaryHex"]))
    if isinstance(value, list):
        return [_restore_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _restore_value(item) for key, item in value.items() if key != "_id"}
    return value


def _export_all_data() -> dict[str, Any]:
    db = get_db()
    return {
        "schemaVersion": "0.8",
        "generatedAt": now_iso(),
        "collections": {
            name: [_json_safe(doc) for doc in db[name].find({}, {"_id": 0})]
            for name in COLLECTIONS
        },
    }


def _count_dump_rows(dump: dict[str, Any]) -> int:
    collections = dump.get("collections", {})
    if not isinstance(collections, dict):
        return 0
    return sum(len(rows) for rows in collections.values() if isinstance(rows, list))


def _to_csv_flattened(dump: dict[str, Any]) -> str:
    output = io.StringIO()
    rows: list[dict[str, Any]] = []
    for collection_name, documents in dump.get("collections", {}).items():
        if not isinstance(documents, list):
            continue
        for document in documents:
            rows.append({"collection": collection_name, "document": json.dumps(document, ensure_ascii=False)})

    writer = csv.DictWriter(output, fieldnames=["collection", "document"])
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


@router.get("/history")
def history(_: dict[str, Any] = Depends(require_moderator_or_admin)) -> list[dict[str, Any]]:
    db = get_db()
    return list(db.import_export_history.find({}, {"_id": 0}).sort("createdAt", -1).limit(50))


@router.post("/imports")
async def import_data(
    entity: str = Form("Все данные"),
    format: str = Form("JSON"),
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(require_moderator_or_admin),
) -> dict[str, Any]:
    db = get_db()
    ext = (file.filename or "").lower()
    fmt = format.lower()

    if fmt != "json" and not ext.endswith(".json"):
        raise HTTPException(status_code=400, detail="Импорт всего приложения поддерживается только в JSON")

    raw = await read_upload_limited(file, max_bytes=MAX_IMPORT_UPLOAD_BYTES, label="Файл импорта")
    if not raw:
        raise HTTPException(status_code=400, detail="Файл пустой или повреждён")

    try:
        dump = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Некорректный JSON") from exc

    collections = dump.get("collections") if isinstance(dump, dict) else None
    if not isinstance(collections, dict):
        raise HTTPException(status_code=400, detail="Ожидался дамп приложения с полем collections")

    imported = 0
    for collection_name in COLLECTIONS:
        rows = collections.get(collection_name)
        if rows is None:
            continue
        if not isinstance(rows, list):
            raise HTTPException(status_code=400, detail=f"Коллекция {collection_name} должна быть массивом")
        db[collection_name].delete_many({})
        restored = [_restore_value(row) for row in rows if isinstance(row, dict)]
        if restored:
            db[collection_name].insert_many(restored)
            imported += len(restored)

    history_doc = {
        "id": f"OP-{db.import_export_history.count_documents({}) + 1:03d}",
        "type": "import",
        "entity": entity,
        "format": "JSON",
        "fileName": file.filename,
        "rows": imported,
        "status": "success",
        "createdBy": user.get("email"),
        "createdAt": now_iso(),
    }
    db.import_export_history.insert_one(history_doc)
    history_doc.pop("_id", None)

    return {"message": "Импорт всего приложения выполнен", "rows": imported, "operation": history_doc}


@router.post("/exports")
def export_data(payload: ExportPayload, user: dict[str, Any] = Depends(require_moderator_or_admin)) -> Response:
    db = get_db()
    fmt = payload.format.lower()
    dump = _export_all_data()
    created = now_iso()

    if fmt == "json":
        content = json.dumps(dump, ensure_ascii=False, indent=2)
        media_type = "application/json; charset=utf-8"
        filename = "bot-arena-full-export.json"
    elif fmt == "csv":
        content = _to_csv_flattened(dump)
        media_type = "text/csv; charset=utf-8"
        filename = "bot-arena-full-export.csv"
    else:
        raise HTTPException(status_code=400, detail="Поддерживаются только JSON и CSV")

    rows = _count_dump_rows(dump)
    db.import_export_history.insert_one({
        "id": f"OP-{db.import_export_history.count_documents({}) + 1:03d}",
        "type": "export",
        "entity": "Все данные",
        "format": fmt.upper(),
        "fileName": filename,
        "rows": rows,
        "status": "success" if rows else "empty",
        "createdBy": user.get("email"),
        "createdAt": created,
    })

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
