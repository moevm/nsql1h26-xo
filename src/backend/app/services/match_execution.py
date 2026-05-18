from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException

from app.core.utils import now_iso
from app.db.connection import get_db
from app.services.sandbox import run_uploaded_bot


DIRECTIONS = ((1, 0), (0, 1), (1, 1), (1, -1))


@dataclass(frozen=True)
class RuntimeLimits:
    timeout_ms: int
    memory_limit_mb: int


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, int(value)))


def _next_seq(db: Any, match_id: str) -> int:
    last = db.match_events.find_one({"match_id": match_id}, {"_id": 0}, sort=[("seq", -1)])
    return int(last.get("seq", 0)) + 1 if last else 1


def _add_event(
    db: Any,
    match_id: str,
    seq: int,
    kind: str,
    bot_id: str | None,
    payload: dict[str, Any],
) -> int:
    db.match_events.insert_one({
        "id": f"E-{match_id}-{seq:03d}",
        "match_id": match_id,
        "seq": seq,
        "kind": kind,
        "ts": now_iso(),
        "bot_id": bot_id or "system",
        "payload": payload,
    })
    return seq + 1


def _count_line(board: dict[tuple[int, int], str], x: int, y: int, mark: str, dx: int, dy: int) -> int:
    total = 1

    nx, ny = x + dx, y + dy
    while board.get((nx, ny)) == mark:
        total += 1
        nx += dx
        ny += dy

    nx, ny = x - dx, y - dy
    while board.get((nx, ny)) == mark:
        total += 1
        nx -= dx
        ny -= dy

    return total


def _has_winner(board: dict[tuple[int, int], str], x: int, y: int, mark: str, win_condition: int) -> bool:
    return any(_count_line(board, x, y, mark, dx, dy) >= win_condition for dx, dy in DIRECTIONS)


def _board_bounds(board: dict[tuple[int, int], str], default_half: int, win_condition: int = 5) -> dict[str, int]:
    """Возвращает именно размер игрового поля, а не только занятый прямоугольник.

    Для UI важно, чтобы board.width=15 означал диапазон координат -7..7.
    Занятые границы сохраняем отдельно как occupied_*, чтобы не ломать
    соответствие координат клеткам на replay-поле.
    """
    bounds = {
        "width": default_half * 2 + 1,
        "height": default_half * 2 + 1,
        "win_condition": win_condition,
        "min_x": -default_half,
        "max_x": default_half,
        "min_y": -default_half,
        "max_y": default_half,
    }

    if board:
        xs = [point[0] for point in board]
        ys = [point[1] for point in board]
        bounds.update({
            "occupied_min_x": min(xs),
            "occupied_max_x": max(xs),
            "occupied_min_y": min(ys),
            "occupied_max_y": max(ys),
        })

    return bounds


def _state_for_bot(
    match_id: str,
    bot_id: str,
    opponent_bot_id: str,
    mark: str,
    moves: list[dict[str, Any]],
    board_half: int,
    win_condition: int,
    max_moves: int,
) -> dict[str, Any]:
    return {
        "matchId": match_id,
        "botId": bot_id,
        "opponentBotId": opponent_bot_id,
        "mark": mark,
        "opponentMark": "O" if mark == "X" else "X",
        "winCondition": win_condition,
        "maxMoves": max_moves,
        "moves": moves,
        "board": {
            "minX": -board_half,
            "maxX": board_half,
            "minY": -board_half,
            "maxY": board_half,
        },
    }


def _fail_match(
    db: Any,
    match: dict[str, Any],
    seq: int,
    message: str,
    bot_id: str | None = None,
    moves: list[dict[str, Any]] | None = None,
    board: dict[tuple[int, int], str] | None = None,
    board_half: int = 9,
    win_condition: int = 5,
) -> dict[str, Any]:
    now = now_iso()
    seq = _add_event(
        db,
        match["id"],
        seq,
        "log",
        bot_id,
        {"level": "ERROR", "message": message, "source": "sandbox"},
    )
    history = (match.get("status_history") or []) + [{"status": "Failed", "time": now}]
    db.matches.update_one(
        {"id": match["id"]},
        {"$set": {
            "status": "Failed",
            "result": "runtime error",
            "finished_at": now,
            "duration_ms": sum(int(item.get("payload", {}).get("decision_ms") or 0) for item in (moves or [])),
            "moves_count": len(moves or []),
            "log_count": db.match_events.count_documents({"match_id": match["id"], "kind": "log"}),
            "board": _board_bounds(board or {}, board_half, win_condition),
            "win_condition": win_condition,
            "status_history": history,
        }},
    )
    updated = db.matches.find_one({"id": match["id"]}, {"_id": 0})
    _recalculate_stats([match.get("bot_a_id"), match.get("bot_b_id")])
    return updated


def _recalculate_stats(bot_ids: list[str | None]) -> None:
    db = get_db()
    for bot_id in {item for item in bot_ids if item}:
        rows = list(db.matches.find({
            "$or": [{"bot_a_id": bot_id}, {"bot_b_id": bot_id}],
            "status": {"$in": ["Finished", "Failed"]},
        }, {"_id": 0}))

        wins = sum(1 for row in rows if row.get("winner_bot_id") == bot_id)
        draws = sum(1 for row in rows if row.get("result") == "draw")
        losses = sum(
            1
            for row in rows
            if row.get("result") != "draw" and row.get("winner_bot_id") not in {None, bot_id}
        )
        # Если матч упал из-за конкретного бота, победителя нет. Для простого прототипа считаем это поражением обоих участников.
        losses += sum(1 for row in rows if row.get("status") == "Failed" and row.get("winner_bot_id") is None)
        total = len(rows)
        avg_moves = round(sum(int(row.get("moves_count") or 0) for row in rows) / max(total, 1), 1)
        avg_duration = round(sum(int(row.get("duration_ms") or 0) for row in rows) / max(total, 1))
        elo = 1000 + wins * 30 + draws * 5 - losses * 20
        winrate = round(wins / max(total, 1), 2)

        db.bot_stats.update_one(
            {"bot_id": bot_id},
            {"$set": {
                "updated_at": now_iso(),
                "elo": elo,
                "total_matches": total,
                "wins": wins,
                "draws": draws,
                "losses": losses,
                "avg_moves": avg_moves,
                "avg_duration_ms": avg_duration,
                "last_100_winrate": winrate,
            }},
            upsert=True,
        )


def execute_match(match_id: str, request_payload: Any) -> dict[str, Any]:
    """Запускает матч двух загруженных Python-ботов через bot-runner.

    Это синхронный учебный запуск: create-match ждёт завершения партии, после чего
    карточка матча сразу содержит ходы, логи, статус и результат.
    """
    db = get_db()
    match = db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Матч не найден")

    board_half = max(1, int(request_payload.boardSize) // 2)
    win_condition = _clamp(int(request_payload.winCondition), 3, 6)
    max_moves = _clamp(int(request_payload.maxMoves), 1, 225)
    limits = RuntimeLimits(
        timeout_ms=_clamp(int(request_payload.timeLimitMs), 100, 5000),
        memory_limit_mb=_clamp(int(request_payload.memoryLimitMb), 32, 256),
    )

    running_at = now_iso()
    history = (match.get("status_history") or []) + [{"status": "Running", "time": running_at}]
    db.matches.update_one(
        {"id": match_id},
        {"$set": {"status": "Running", "result": "running", "status_history": history}},
    )

    seq = _next_seq(db, match_id)
    seq = _add_event(
        db,
        match_id,
        seq,
        "log",
        "system",
        {"level": "INFO", "message": "match execution started in sandbox-runner", "source": "api"},
    )

    board: dict[tuple[int, int], str] = {}
    moves: list[dict[str, Any]] = []
    bot_a = str(match["bot_a_id"])
    bot_b = str(match["bot_b_id"])
    winner_bot_id: str | None = None
    result = "draw"

    for turn in range(max_moves):
        bot_id = bot_a if turn % 2 == 0 else bot_b
        opponent_id = bot_b if bot_id == bot_a else bot_a
        mark = "X" if bot_id == bot_a else "O"
        state = _state_for_bot(match_id, bot_id, opponent_id, mark, moves, board_half, win_condition, max_moves)

        try:
            runner_result = run_uploaded_bot(
                bot_id=bot_id,
                state=state,
                timeout_ms=limits.timeout_ms,
                memory_limit_mb=limits.memory_limit_mb,
            )
        except HTTPException as exc:
            return _fail_match(db, match, seq, f"{bot_id}: {exc.detail}", bot_id, moves, board, board_half, win_condition)
        except Exception as exc:
            return _fail_match(db, match, seq, f"{bot_id}: unexpected sandbox error: {exc}", bot_id, moves, board, board_half, win_condition)

        if not runner_result.get("ok"):
            error = runner_result.get("error") or "бот не вернул корректный ход"
            stderr = str(runner_result.get("stderr") or "").strip()
            if stderr:
                error = f"{error}; stderr: {stderr[:500]}"
            return _fail_match(db, match, seq, f"{bot_id}: {error}", bot_id, moves, board, board_half, win_condition)

        move = runner_result.get("move") or {}
        x = move.get("x")
        y = move.get("y")
        if not isinstance(x, int) or not isinstance(y, int):
            return _fail_match(db, match, seq, f"{bot_id}: бот вернул ход без целых x/y", bot_id, moves, board, board_half, win_condition)
        if not (-board_half <= x <= board_half and -board_half <= y <= board_half):
            return _fail_match(db, match, seq, f"{bot_id}: ход ({x}, {y}) вне разрешённого поля", bot_id, moves, board, board_half, win_condition)
        if (x, y) in board:
            return _fail_match(db, match, seq, f"{bot_id}: клетка ({x}, {y}) уже занята", bot_id, moves, board, board_half, win_condition)

        board[(x, y)] = mark
        event_payload = {
            "mark": mark,
            "x": x,
            "y": y,
            "decision_ms": int(runner_result.get("duration_ms") or 0),
            "source": "uploaded-python-bot",
        }
        seq = _add_event(db, match_id, seq, "move", bot_id, event_payload)
        moves.append({
            "seq": len(moves) + 1,
            "bot_id": bot_id,
            "kind": "move",
            "payload": event_payload,
        })

        if _has_winner(board, x, y, mark, win_condition):
            winner_bot_id = bot_id
            result = f"{bot_id} win"
            break

    finished_at = now_iso()
    final_status = "Finished"
    history = history + [{"status": final_status, "time": finished_at}]
    seq = _add_event(
        db,
        match_id,
        seq,
        "log",
        "system",
        {"level": "INFO", "message": f"match finished: {result}", "source": "sandbox"},
    )

    db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "status": final_status,
            "result": result,
            "winner_bot_id": winner_bot_id,
            "finished_at": finished_at,
            "moves_count": len(moves),
            "log_count": db.match_events.count_documents({"match_id": match_id, "kind": "log"}),
            "duration_ms": sum(int(item["payload"].get("decision_ms") or 0) for item in moves),
            "board": _board_bounds(board, board_half, win_condition),
            "win_condition": win_condition,
            "status_history": history,
        }},
    )

    _recalculate_stats([bot_a, bot_b])
    return db.matches.find_one({"id": match_id}, {"_id": 0})
