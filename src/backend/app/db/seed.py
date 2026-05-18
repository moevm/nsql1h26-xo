from __future__ import annotations

from app.core.utils import now_iso
from app.db.connection import get_db, wait_for_database


def _iso(day: int, hour: int = 12, minute: int = 0) -> str:
    return f"2026-03-{day:02d}T{hour:02d}:{minute:02d}:00+00:00"


def seed_database() -> None:
    """Наполняет пустую MongoDB демонстрационными данными при старте приложения."""
    wait_for_database()
    db = get_db()

    # Если основные данные уже есть, не перезатираем состояние пользователя.
    if db.bots.count_documents({}) > 0:
        return
    
    db.users.insert_many([
        {"id": "U-001", "name": "Debug Admin", "email": "admin@arena.local", "password": "admin123", "role": "admin", "created_at": _iso(1)},
        {"id": "U-002", "name": "Debug Moderator", "email": "moderator@arena.local", "password": "moderator123", "role": "moderator", "created_at": _iso(1, 13)},
        {"id": "U-003", "name": "Debug User", "email": "user@arena.local", "password": "user123", "role": "user", "created_at": _iso(1, 14)},
        {"id": "U-004", "name": "Иван Петров", "email": "student01@arena.local", "password": "student123", "role": "user", "created_at": _iso(2)},
        {"id": "U-005", "name": "Мария Сидорова", "email": "student02@arena.local", "password": "student123", "role": "user", "created_at": _iso(2, 13)},
        {"id": "U-006", "name": "Алексей Иванов", "email": "student03@arena.local", "password": "student123", "role": "user", "created_at": _iso(2, 14)},
        {"id": "U-007", "name": "Ольга Ким", "email": "student04@arena.local", "password": "student123", "role": "user", "created_at": _iso(3)},
        {"id": "U-008", "name": "Никита Волков", "email": "student05@arena.local", "password": "student123", "role": "user", "created_at": _iso(3, 13)},
    ])

    bot_templates = [
        ("DiagonalHunter", "Python", "2.1.0", "active", ["aggressive", "baseline"], "Агрессивная стратегия для построения диагоналей."),
        ("DefenderZero", "Python", "1.8.3", "active", ["defense", "heuristic"], "Защитная эвристика, блокирует линии соперника."),
        ("RandomWalker", "Python", "1.0.1", "archived", ["random", "baseline"], "Случайная стратегия для базового сравнения."),
        ("CenterControl", "Python", "3.0.0", "active", ["center", "stable"], "Контролирует центральную область поля."),
        ("ForkMaster", "Python", "0.9.4", "active", ["fork", "fast"], "Ищет вилки и двойные угрозы."),
        ("LineBreaker", "Python", "1.2.0", "active", ["defense", "counter"], "Разрывает линии соперника контрходами."),
        ("SilentBot", "Python", "0.7.2", "disabled", ["sandbox", "slow"], "Тестовый бот с повышенным временем ответа."),
        ("EdgeRunner", "Python", "2.4.1", "active", ["edge", "experimental"], "Играет от краёв и расширяет поле."),
    ]

    bots = []
    versions = []
    stats = []
    for i, (name, language, version, status, tags, description) in enumerate(bot_templates, start=1):
        bot_id = f"B-{i:03d}"
        version_id = f"V-{i:03d}"
        created = _iso(min(i + 2, 20), 10 + i % 8, 0)
        wins = [5, 4, 1, 6, 7, 3, 0, 4][i - 1]
        draws = [1, 1, 0, 2, 0, 1, 0, 2][i - 1]
        losses = [2, 3, 3, 1, 1, 4, 2, 2][i - 1]
        total = wins + draws + losses
        bots.append({
            "id": bot_id,
            "owner_login": f"student{i:02d}",
            "uploaded_by": ["Иван Петров", "Мария Сидорова", "Алексей Иванов", "Ольга Ким", "Никита Волков", "Елена Морозова", "Павел Орлов", "Анна Кузнецова"][i - 1],
            "name": name,
            "language": language,
            "version": version,
            "visibility": "public" if i != 7 else "private",
            "status": status,
            "created_at": created,
            "updated_at": _iso(20 - i % 5, 15, i),
            "active_version_id": version_id,
            "tags": tags,
            "hash": (hex(0xA7F3D9E2 + i)[2:])[:8],
            "description": description,
            "comment": "Демонстрационная запись для проверки сценариев.",
            "file_name": f"{name.lower()}_{version.replace('.', '_')}.py",
            "size_bytes": 900 + i * 173,
            "run_settings": {"max_moves": 225, "move_timeout_ms": 1000},
        })
        versions.append({
            "id": version_id,
            "bot_id": bot_id,
            "version_no": max(1, i % 5 + 1),
            "sha256": chr(96 + i) * 64,
            "size_bytes": 900 + i * 173,
            "entrypoint": "main.py",
            "source_blob": b"import json, sys\nstate=json.load(sys.stdin)\nused={(m.get('payload',m).get('x'),m.get('payload',m).get('y')) for m in state.get('moves',[])}\nb=state.get('board',{})\nfor y in range(int(b.get('minY',-9)), int(b.get('maxY',9))+1):\n    for x in range(int(b.get('minX',-9)), int(b.get('maxX',9))+1):\n        if (x,y) not in used:\n            print(json.dumps({'x':x,'y':y}))\n            raise SystemExit\nprint(json.dumps({'x':0,'y':0}))\n",
            "created_at": created,
        })
        stats.append({
            "bot_id": bot_id,
            "updated_at": now_iso(),
            "elo": [1240, 1195, 980, 1310, 1380, 1105, 870, 1160][i - 1],
            "total_matches": total,
            "wins": wins,
            "draws": draws,
            "losses": losses,
            "avg_moves": [170, 190, 120, 160, 145, 210, 80, 175][i - 1],
            "avg_duration_ms": [18000, 21000, 9000, 16000, 14000, 25000, 52000, 17000][i - 1],
            "last_100_winrate": round(wins / max(total, 1), 2),
        })

    db.bots.insert_many(bots)
    db.bot_versions.insert_many(versions)
    db.bot_stats.insert_many(stats)

    match_pairs = [
        ("B-001", "B-002", "Finished", "B-001 win", "B-001", 18, 5, 19000),
        ("B-002", "B-003", "Finished", "B-002 win", "B-002", 12, 4, 11000),
        ("B-003", "B-001", "Failed", "runtime error", None, 4, 3, 4000),
        ("B-004", "B-005", "Finished", "draw", None, 225, 6, 46000),
        ("B-005", "B-006", "Finished", "B-005 win", "B-005", 31, 5, 22000),
        ("B-006", "B-008", "Running", "running", None, 44, 4, 0),
        ("B-008", "B-001", "Queued", "queued", None, 0, 1, 0),
        ("B-004", "B-002", "Finished", "B-004 win", "B-004", 27, 5, 20000),
    ]

    matches = []
    events = []
    marks = ["X", "O"]
    for i, (bot_a, bot_b, status, result, winner, moves_count, log_count, duration) in enumerate(match_pairs, start=1):
        match_id = f"M-{2844 + i}"
        started = _iso(12 + i, 10 + i % 8, i)
        finished = None if status in {"Queued", "Running"} else _iso(12 + i, 10 + i % 8, min(i + 1, 59))
        history = [{"status": "Queued", "time": started}]
        if status in {"Running", "Finished", "Failed"}:
            history.append({"status": "Running", "time": started})
        if status in {"Finished", "Failed"}:
            history.append({"status": status, "time": finished})
        matches.append({
            "id": match_id,
            "bot_a_id": bot_a,
            "bot_b_id": bot_b,
            "rules": "Поле 19×19; победа: 5 в ряд",
            "win_condition": 5,
            "started_at": started,
            "finished_at": finished,
            "status": status,
            "result": result,
            "winner_bot_id": winner,
            "moves_count": moves_count,
            "log_count": log_count,
            "duration_ms": duration,
            "board": {"width": 19, "height": 19, "min_x": -9, "max_x": 9, "min_y": -9, "max_y": 9, "win_condition": 5},
            "comment": "Демонстрационный матч для просмотра статусов и истории ходов.",
            "status_history": history,
        })
        for seq in range(1, min(moves_count, 24) + 1):
            current_bot = bot_a if seq % 2 else bot_b
            events.append({
                "id": f"E-{match_id}-{seq:03d}",
                "match_id": match_id,
                "seq": seq,
                "kind": "move",
                "ts": _iso(12 + i, 10 + i % 8, min(i + seq, 59)),
                "bot_id": current_bot,
                "payload": {"mark": marks[(seq - 1) % 2], "x": seq - 10, "y": (seq * i) % 11 - 5, "decision_ms": 7 + seq + i},
            })
        for j in range(1, log_count + 1):
            level = "ERROR" if status == "Failed" and j == log_count else ("WARN" if status == "Running" and j == log_count else "INFO")
            message = {
                "INFO": f"match {match_id}: processed step {j}",
                "WARN": "decision time close to limit",
                "ERROR": "RuntimeError: invalid move outside allowed window",
            }[level]
            events.append({
                "id": f"E-{match_id}-L{j:03d}",
                "match_id": match_id,
                "seq": min(moves_count, 24) + j,
                "kind": "log",
                "ts": _iso(12 + i, 10 + i % 8, min(i + j + 30, 59)),
                "bot_id": bot_a if j % 2 else bot_b,
                "payload": {"level": level, "message": message, "source": "stderr"},
            })

    db.matches.insert_many(matches)
    db.match_events.insert_many(events)

    db.reports.insert_many([
        {"id": f"R-{i:03d}", "name": f"Отчёт по ботам {i}", "config": {"dataset": "Матчи", "metrics": ["winrate", "duration"], "groupBy": "Бот", "chartType": "bar", "filters": []}, "created_by": "admin@arena.local", "created_at": _iso(20, 8, i)}
        for i in range(1, 9)
    ])
    db.import_export_history.insert_many([
        {"id": f"OP-{i:03d}", "type": "export" if i % 2 else "import", "entity": "Все данные", "format": "JSON", "fileName": f"bot-arena-dump-{i}.json", "rows": 8 + i, "status": "success", "createdBy": "admin@arena.local", "createdAt": _iso(21, 9, i)}
        for i in range(1, 9)
    ])
    db.app_settings.insert_one({
        "id": "global",
        "sandboxTimeLimit": 5000,
        "sandboxMemoryLimit": 512,
        "defaultLogLevel": "INFO",
        "logRetention": "30 дней",
        "updatedAt": now_iso(),
    })

    db.bots.create_index([("name", 1)])
    db.bots.create_index([("language", 1)])
    db.matches.create_index([("bot_a_id", 1), ("bot_b_id", 1)])
    db.match_events.create_index([("match_id", 1), ("seq", 1)])
