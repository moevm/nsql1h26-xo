from __future__ import annotations

from app.core.utils import now_iso
from app.db.connection import get_db


def seed_database() -> None:
    db = get_db()

    if db.users.count_documents({}) > 0:
        return

    db.users.insert_many([
        {"id": "U-001", "name": "Debug Admin", "email": "admin@arena.local", "password": "admin123", "role": "admin"},
        {"id": "U-002", "name": "Debug Moderator", "email": "moderator@arena.local", "password": "moderator123", "role": "moderator"},
        {"id": "U-003", "name": "Debug User", "email": "user@arena.local", "password": "user123", "role": "user"},
    ])

    bots = [
        {
            "id": "B-001", "owner_login": "student01", "uploaded_by": "Иван Петров", "name": "DiagonalHunter",
            "language": "Python", "version": "2.1.0", "visibility": "public", "status": "active",
            "created_at": "2026-03-01T12:00:00+00:00", "updated_at": "2026-03-20T15:00:00+00:00",
            "active_version_id": "V-001", "tags": ["aggressive", "baseline"], "hash": "a7f3d9e2",
            "description": "Агрессивная стратегия для быстрого построения диагональных линий.", "comment": "Основной тестовый бот.",
            "file_name": "diagonal_hunter.zip", "size_bytes": 1024,
        },
        {
            "id": "B-002", "owner_login": "student02", "uploaded_by": "Мария Сидорова", "name": "DefenderZero",
            "language": "Python", "version": "1.8.3", "visibility": "public", "status": "active",
            "created_at": "2026-03-02T10:00:00+00:00", "updated_at": "2026-03-20T15:02:00+00:00",
            "active_version_id": "V-002", "tags": ["defense", "heuristic"], "hash": "b4c6e1a8",
            "description": "Защитная эвристика, блокирует потенциальные линии соперника.", "comment": "Версия для сравнения.",
            "file_name": "defender_zero.zip", "size_bytes": 1536,
        },
        {
            "id": "B-003", "owner_login": "student03", "uploaded_by": "Алексей Иванов", "name": "RandomWalker",
            "language": "JavaScript", "version": "1.0.1", "visibility": "public", "status": "archived",
            "created_at": "2026-02-18T09:00:00+00:00", "updated_at": "2026-03-10T08:00:00+00:00",
            "active_version_id": "V-003", "tags": ["random", "baseline"], "hash": "c8d2f5b3",
            "description": "Простая случайная стратегия для базового сравнения.", "comment": "Архивная версия.",
            "file_name": "random_walker.js", "size_bytes": 768,
        },
    ]
    db.bots.insert_many(bots)

    db.bot_versions.insert_many([
        {"id": "V-001", "bot_id": "B-001", "version_no": 4, "sha256": "a" * 64, "size_bytes": 1024, "entrypoint": "main.py", "source_blob": b"demo", "created_at": "2026-03-20T15:00:00+00:00"},
        {"id": "V-002", "bot_id": "B-002", "version_no": 2, "sha256": "b" * 64, "size_bytes": 1536, "entrypoint": "main.py", "source_blob": b"demo", "created_at": "2026-03-20T15:02:00+00:00"},
        {"id": "V-003", "bot_id": "B-003", "version_no": 1, "sha256": "c" * 64, "size_bytes": 768, "entrypoint": "index.js", "source_blob": b"demo", "created_at": "2026-03-10T08:00:00+00:00"},
    ])

    db.bot_stats.insert_many([
        {"bot_id": "B-001", "updated_at": now_iso(), "elo": 1240, "total_matches": 8, "wins": 5, "draws": 1, "losses": 2, "avg_moves": 170, "avg_duration_ms": 18000, "last_100_winrate": 0.62},
        {"bot_id": "B-002", "updated_at": now_iso(), "elo": 1195, "total_matches": 8, "wins": 4, "draws": 1, "losses": 3, "avg_moves": 190, "avg_duration_ms": 21000, "last_100_winrate": 0.50},
        {"bot_id": "B-003", "updated_at": now_iso(), "elo": 980, "total_matches": 4, "wins": 1, "draws": 0, "losses": 3, "avg_moves": 120, "avg_duration_ms": 9000, "last_100_winrate": 0.25},
    ])

    matches = [
        {
            "id": "M-2847", "bot_a_id": "B-001", "bot_b_id": "B-002", "rules": "infinite-ttt-5",
            "started_at": "2026-03-20T15:00:00+00:00", "finished_at": "2026-03-20T15:00:19+00:00",
            "status": "Finished", "result": "B-001 win", "winner_bot_id": "B-001", "moves_count": 18, "log_count": 5,
            "duration_ms": 19000, "board": {"width": 19, "height": 19, "min_x": -5, "max_x": 13, "min_y": -8, "max_y": 10},
            "status_history": [
                {"status": "Queued", "time": "20.03.2026 15:00"},
                {"status": "Running", "time": "20.03.2026 15:00"},
                {"status": "Finished", "time": "20.03.2026 15:00"},
            ],
        },
        {
            "id": "M-2846", "bot_a_id": "B-002", "bot_b_id": "B-003", "rules": "infinite-ttt-5",
            "started_at": "2026-03-19T12:30:00+00:00", "finished_at": "2026-03-19T12:30:11+00:00",
            "status": "Finished", "result": "B-002 win", "winner_bot_id": "B-002", "moves_count": 12, "log_count": 4,
            "duration_ms": 11000, "board": {"width": 15, "height": 15, "min_x": -4, "max_x": 10, "min_y": -7, "max_y": 7},
            "status_history": [
                {"status": "Queued", "time": "19.03.2026 12:30"},
                {"status": "Running", "time": "19.03.2026 12:30"},
                {"status": "Finished", "time": "19.03.2026 12:30"},
            ],
        },
        {
            "id": "M-2845", "bot_a_id": "B-003", "bot_b_id": "B-001", "rules": "infinite-ttt-5",
            "started_at": "2026-03-18T18:05:00+00:00", "finished_at": "2026-03-18T18:05:04+00:00",
            "status": "Failed", "result": "runtime error", "winner_bot_id": None, "moves_count": 4, "log_count": 3,
            "duration_ms": 4000, "board": {"width": 9, "height": 9, "min_x": -4, "max_x": 4, "min_y": -4, "max_y": 4},
            "status_history": [
                {"status": "Queued", "time": "18.03.2026 18:05"},
                {"status": "Running", "time": "18.03.2026 18:05"},
                {"status": "Failed", "time": "18.03.2026 18:05"},
            ],
        },
    ]
    db.matches.insert_many(matches)

    events = []
    marks = ["X", "O"]

    for idx in range(18):
        bot_id = "B-001" if idx % 2 == 0 else "B-002"
        events.append({
            "id": f"E-2847-{idx + 1:03d}", "match_id": "M-2847", "seq": idx + 1, "kind": "move",
            "ts": f"2026-03-20T15:00:{idx:02d}+00:00", "bot_id": bot_id,
            "payload": {"mark": marks[idx % 2], "x": idx - 5, "y": (idx * 2) % 9 - 4, "decision_ms": 12 + idx},
        })

    log_messages = [
        (19, "B-001", "INFO", "selected candidate (12,-4) with score 0.82"),
        (20, "B-002", "INFO", "blocked diagonal threat near (7,1)"),
        (21, "B-001", "DEBUG", "expanded 143 candidate cells"),
        (22, "B-002", "WARN", "decision time close to limit"),
        (23, "B-001", "INFO", "finished with diagonal sequence"),
    ]

    for seq, bot_id, level, msg in log_messages:
        events.append({
            "id": f"E-2847-{seq:03d}", "match_id": "M-2847", "seq": seq, "kind": "log",
            "ts": f"2026-03-20T15:00:{min(seq, 59):02d}+00:00", "bot_id": bot_id,
            "payload": {"level": level, "message": msg, "source": "stderr"},
        })

    for idx in range(12):
        bot_id = "B-002" if idx % 2 == 0 else "B-003"
        events.append({
            "id": f"E-2846-{idx + 1:03d}", "match_id": "M-2846", "seq": idx + 1, "kind": "move",
            "ts": f"2026-03-19T12:30:{idx:02d}+00:00", "bot_id": bot_id,
            "payload": {"mark": marks[idx % 2], "x": idx - 3, "y": idx % 5, "decision_ms": 10 + idx},
        })

    for seq, bot_id, level, msg in [
        (13, "B-002", "INFO", "match started"),
        (14, "B-003", "DEBUG", "random seed initialized"),
        (15, "B-002", "INFO", "forced fork detected"),
        (16, "B-003", "INFO", "match finished"),
    ]:
        events.append({
            "id": f"E-2846-{seq:03d}", "match_id": "M-2846", "seq": seq, "kind": "log",
            "ts": f"2026-03-19T12:30:{seq:02d}+00:00", "bot_id": bot_id,
            "payload": {"level": level, "message": msg, "source": "stderr"},
        })

    for idx in range(4):
        events.append({
            "id": f"E-2845-{idx + 1:03d}", "match_id": "M-2845", "seq": idx + 1,
            "kind": "move", "ts": f"2026-03-18T18:05:0{idx}+00:00",
            "bot_id": "B-003" if idx % 2 == 0 else "B-001",
            "payload": {"mark": marks[idx % 2], "x": idx, "y": -idx, "decision_ms": 8},
        })

    for seq, bot_id, level, msg in [
        (5, "B-003", "INFO", "process started"),
        (6, "B-003", "ERROR", "RuntimeError: invalid move outside allowed window"),
        (7, "B-001", "INFO", "opponent failed, match stopped"),
    ]:
        events.append({
            "id": f"E-2845-{seq:03d}", "match_id": "M-2845", "seq": seq, "kind": "log",
            "ts": f"2026-03-18T18:05:0{min(seq, 9)}+00:00", "bot_id": bot_id,
            "payload": {"level": level, "message": msg, "source": "stderr"},
        })

    db.match_events.insert_many(events)

    db.bots.create_index([("name", 1)])
    db.bots.create_index([("language", 1)])
    db.matches.create_index([("bot_a_id", 1), ("bot_b_id", 1)])
    db.match_events.create_index([("match_id", 1), ("seq", 1)])
