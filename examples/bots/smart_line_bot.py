#!/usr/bin/env python3

import json
import sys
from typing import Any


DIRECTIONS = [
    (1, 0),
    (0, 1),
    (1, 1),
    (1, -1),
]


def read_state() -> dict[str, Any]:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def extract_move(raw: dict[str, Any]) -> dict[str, Any] | None:
    payload = raw.get("payload") if isinstance(raw.get("payload"), dict) else raw

    x = payload.get("x")
    y = payload.get("y")
    mark = payload.get("mark")

    if not isinstance(x, int) or not isinstance(y, int):
        return None

    return {
        "x": x,
        "y": y,
        "mark": str(mark) if mark is not None else "",
    }


def build_board(state: dict[str, Any]) -> tuple[dict[tuple[int, int], str], str, str]:
    my_mark = str(state.get("mark") or "X")
    opponent_mark = "O" if my_mark == "X" else "X"

    board: dict[tuple[int, int], str] = {}

    for raw in state.get("moves", []):
        if not isinstance(raw, dict):
            continue

        move = extract_move(raw)
        if move is None:
            continue

        mark = move["mark"]
        if mark not in {"X", "O"}:
            # Если mark не передали, восстанавливаем по номеру хода
            mark = "X" if len(board) % 2 == 0 else "O"

        board[(move["x"], move["y"])] = mark

    return board, my_mark, opponent_mark


def count_line(board: dict[tuple[int, int], str], x: int, y: int, mark: str, dx: int, dy: int) -> int:
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


def best_line_score(board: dict[tuple[int, int], str], x: int, y: int, mark: str) -> int:
    return max(count_line(board, x, y, mark, dx, dy) for dx, dy in DIRECTIONS)


def get_bounds(state: dict[str, Any]) -> tuple[int, int, int, int]:
    board_info = state.get("board") if isinstance(state.get("board"), dict) else {}

    min_x = board_info.get("minX", board_info.get("min_x", -9))
    max_x = board_info.get("maxX", board_info.get("max_x", 9))
    min_y = board_info.get("minY", board_info.get("min_y", -9))
    max_y = board_info.get("maxY", board_info.get("max_y", 9))

    try:
        return int(min_x), int(max_x), int(min_y), int(max_y)
    except Exception:
        return -9, 9, -9, 9


def generate_candidates(state: dict[str, Any], board: dict[tuple[int, int], str]) -> list[tuple[int, int]]:
    min_x, max_x, min_y, max_y = get_bounds(state)

    if not board:
        if min_x <= 0 <= max_x and min_y <= 0 <= max_y:
            return [(0, 0)]
        return [((min_x + max_x) // 2, (min_y + max_y) // 2)]

    candidates: set[tuple[int, int]] = set()

    # Сначала ищем рядом с уже занятыми клетками
    for x, y in board:
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                nx = x + dx
                ny = y + dy

                if (nx, ny) in board:
                    continue
                if min_x <= nx <= max_x and min_y <= ny <= max_y:
                    candidates.add((nx, ny))

    # Если по границам ничего не нашли, расширяемся вокруг центра
    if not candidates:
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if (x, y) not in board:
                    candidates.add((x, y))

    return list(candidates)


def choose_move(state: dict[str, Any]) -> tuple[int, int]:
    board, my_mark, opponent_mark = build_board(state)
    win_condition = int(state.get("winCondition") or state.get("win_condition") or 5)
    candidates = generate_candidates(state, board)

    if not candidates:
        return 0, 0

    # 1. Если можем выиграть одним ходом - выигрываем
    for x, y in candidates:
        if best_line_score(board, x, y, my_mark) >= win_condition:
            return x, y

    # 2. Если соперник может выиграть следующим ходом - блокируем
    for x, y in candidates:
        if best_line_score(board, x, y, opponent_mark) >= win_condition:
            return x, y

    # 3. Иначе выбираем ход с лучшей эвристикой
    def score(candidate: tuple[int, int]) -> tuple[int, int, int, int]:
        x, y = candidate

        own_line = best_line_score(board, x, y, my_mark)
        enemy_line = best_line_score(board, x, y, opponent_mark)

        # Бонус за близость к центру, чтобы бот не убегал слишком далеко
        center_bonus = -abs(x) - abs(y)

        # Бонус за соседство с занятыми клетками
        neighbours = 0
        for dx in range(-1, 2):
            for dy in range(-1, 2):
                if dx == 0 and dy == 0:
                    continue
                if (x + dx, y + dy) in board:
                    neighbours += 1

        return (
            own_line * 10 + enemy_line * 8 + neighbours * 2,
            own_line,
            center_bonus,
            -abs(x * 31 + y * 17),
        )

    return max(candidates, key=score)


def main() -> None:
    state = read_state()
    x, y = choose_move(state)
    print(json.dumps({"x": int(x), "y": int(y)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
