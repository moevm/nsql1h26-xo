from __future__ import annotations

from math import ceil
from typing import Any


def normalize_pagination(page: int = 1, page_size: int = 10) -> tuple[int, int]:
    safe_page = max(1, int(page or 1))
    safe_page_size = max(1, min(100, int(page_size or 10)))
    return safe_page, safe_page_size


def paginate_list(items: list[dict[str, Any]], page: int = 1, page_size: int = 10) -> dict[str, Any]:
    safe_page, safe_page_size = normalize_pagination(page, page_size)
    total = len(items)
    total_pages = max(1, ceil(total / safe_page_size))
    if safe_page > total_pages:
        safe_page = total_pages

    start = (safe_page - 1) * safe_page_size
    end = start + safe_page_size

    return {
        "items": items[start:end],
        "total": total,
        "page": safe_page,
        "pageSize": safe_page_size,
        "totalPages": total_pages,
    }
