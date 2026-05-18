from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from app.limits import limit_process
from app.move_parser import parse_move
from app.schemas import RunRequest, RunResponse

OUTPUT_LIMIT = 4000


def _cut_output(value: str | bytes | None) -> str:
    if value is None:
        return ""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")[:OUTPUT_LIMIT]
    return value[:OUTPUT_LIMIT]


def run_python_bot(payload: RunRequest) -> RunResponse:
    """Запускает код бота как отдельный Python-процесс и возвращает ход."""
    started = time.perf_counter()
    state_json = json.dumps(payload.state, ensure_ascii=False)
    timeout_seconds = payload.timeout_ms / 1000

    with tempfile.TemporaryDirectory(prefix="bot-run-") as tmp:
        workdir = Path(tmp)
        bot_file = workdir / "bot.py"
        bot_file.write_text(payload.code, encoding="utf-8")

        try:
            completed = subprocess.run(
                [sys.executable, "-I", str(bot_file)],
                input=state_json,
                text=True,
                capture_output=True,
                timeout=timeout_seconds,
                cwd=str(workdir),
                env={
                    "PYTHONIOENCODING": "utf-8",
                    "PYTHONDONTWRITEBYTECODE": "1",
                    "PATH": os.environ.get("PATH", ""),
                },
                preexec_fn=lambda: limit_process(payload.memory_limit_mb),
            )
        except subprocess.TimeoutExpired as exc:
            return RunResponse(
                ok=False,
                stdout=_cut_output(exc.stdout),
                stderr=_cut_output(exc.stderr),
                error=f"бот превысил лимит времени {payload.timeout_ms} мс",
                duration_ms=int((time.perf_counter() - started) * 1000),
            )

    stdout = _cut_output(completed.stdout)
    stderr = _cut_output(completed.stderr)
    duration_ms = int((time.perf_counter() - started) * 1000)

    if completed.returncode != 0:
        return RunResponse(
            ok=False,
            stdout=stdout,
            stderr=stderr,
            error=f"бот завершился с кодом {completed.returncode}",
            duration_ms=duration_ms,
        )

    try:
        move = parse_move(stdout)
    except ValueError as exc:
        return RunResponse(
            ok=False,
            stdout=stdout,
            stderr=stderr,
            error=str(exc),
            duration_ms=duration_ms,
        )

    return RunResponse(
        ok=True,
        move=move,
        stdout=stdout,
        stderr=stderr,
        duration_ms=duration_ms,
    )
