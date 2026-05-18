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
    enemy_mark = "O" if my_mark == "X" else "X"

    board: dict[tuple[int, int], str] = {}

    for raw in state.get("moves", []):
        if not isinstance(raw, dict):
            continue

        move = extract_move(raw)
        if move is None:
            continue

        mark = move["mark"]
        if mark not in {"X", "O"}:
            mark = "X" if len(board) % 2 == 0 else "O"

        board[(move["x"], move["y"])] = mark

    return board, my_mark, enemy_mark


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


def line_count(board: dict[tuple[int, int], str], x: int, y: int, mark: str, dx: int, dy: int) -> int:
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


def open_ends(board: dict[tuple[int, int], str], x: int, y: int, mark: str, dx: int, dy: int) -> int:
    result = 0

    nx, ny = x + dx, y + dy
    while board.get((nx, ny)) == mark:
        nx += dx
        ny += dy
    if (nx, ny) not in board:
        result += 1

    nx, ny = x - dx, y - dy
    while board.get((nx, ny)) == mark:
        nx -= dx
        ny -= dy
    if (nx, ny) not in board:
        result += 1

    return result


def best_line(board: dict[tuple[int, int], str], x: int, y: int, mark: str) -> int:
    return max(line_count(board, x, y, mark, dx, dy) for dx, dy in DIRECTIONS)


def generate_candidates(state: dict[str, Any], board: dict[tuple[int, int], str], my_mark: str) -> list[tuple[int, int]]:
    min_x, max_x, min_y, max_y = get_bounds(state)

    if not board:
        if min_x <= 0 <= max_x and min_y <= 0 <= max_y:
            return [(0, 0)]
        return [((min_x + max_x) // 2, (min_y + max_y) // 2)]

    candidates: set[tuple[int, int]] = set()
    my_cells = [point for point, mark in board.items() if mark == my_mark]
    base_cells = my_cells if my_cells else list(board.keys())

    # Агрессивный бот сначала смотрит вокруг своих клеток
    for x, y in base_cells:
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                nx = x + dx
                ny = y + dy

                if (nx, ny) in board:
                    continue
                if min_x <= nx <= max_x and min_y <= ny <= max_y:
                    candidates.add((nx, ny))

    if not candidates:
        for y in range(min_y, max_y + 1):
            for x in range(min_x, max_x + 1):
                if (x, y) not in board:
                    candidates.add((x, y))

    return list(candidates)


def choose_move(state: dict[str, Any]) -> tuple[int, int]:
    board, my_mark, enemy_mark = build_board(state)
    win_condition = int(state.get("winCondition") or state.get("win_condition") or 5)
    candidates = generate_candidates(state, board, my_mark)

    if not candidates:
        return 0, 0

    # 1. Если есть победа прямо сейчас - берём её
    for x, y in candidates:
        if best_line(board, x, y, my_mark) >= win_condition:
            return x, y

    # 2. Блокируем только реально опасную линию соперника
    for x, y in candidates:
        if best_line(board, x, y, enemy_mark) >= win_condition:
            return x, y

    danger_threshold = max(3, win_condition - 1)
    dangerous_blocks = [
        (x, y)
        for x, y in candidates
        if best_line(board, x, y, enemy_mark) >= danger_threshold
    ]
    if dangerous_blocks:
        return max(
            dangerous_blocks,
            key=lambda point: (
                best_line(board, point[0], point[1], enemy_mark),
                -abs(point[0]) - abs(point[1]),
            ),
        )

    # 3. Агрессивная оценка: свои линии важнее защиты
    def score(point: tuple[int, int]) -> tuple[int, int, int, int]:
        x, y = point

        own_best = 0
        own_open = 0
        enemy_best = 0

        for dx, dy in DIRECTIONS:
            own_best = max(own_best, line_count(board, x, y, my_mark, dx, dy))
            own_open = max(own_open, open_ends(board, x, y, my_mark, dx, dy))
            enemy_best = max(enemy_best, line_count(board, x, y, enemy_mark, dx, dy))

        own_neighbours = 0
        enemy_neighbours = 0

        for dx in range(-1, 2):
            for dy in range(-1, 2):
                if dx == 0 and dy == 0:
                    continue

                mark = board.get((x + dx, y + dy))
                if mark == my_mark:
                    own_neighbours += 1
                elif mark == enemy_mark:
                    enemy_neighbours += 1

        center_bonus = -abs(x) - abs(y)

        return (
            own_best * 20 + own_open * 8 + own_neighbours * 5 + enemy_best * 3,
            own_best,
            own_neighbours - enemy_neighbours,
            center_bonus,
        )

    return max(candidates, key=score)


def main() -> None:
    state = read_state()
    x, y = choose_move(state)
    print(json.dumps({"x": int(x), "y": int(y)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
