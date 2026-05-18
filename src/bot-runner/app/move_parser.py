from __future__ import annotations

import json


def parse_move(stdout: str) -> dict[str, int]:
    text = stdout.strip().splitlines()[-1] if stdout.strip() else ""
    if not text:
        raise ValueError("бот не вернул ход в stdout")

    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError('бот должен вывести JSON вида {"x": 1, "y": 2}') from exc

    if not isinstance(raw, dict):
        raise ValueError("ответ бота должен быть JSON-объектом")

    x = raw.get("x")
    y = raw.get("y")
    if not isinstance(x, int) or not isinstance(y, int):
        raise ValueError("поля x и y должны быть целыми числами")

    return {"x": x, "y": y}
