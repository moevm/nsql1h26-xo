from __future__ import annotations

import resource


def limit_process(memory_limit_mb: int) -> None:
    memory_bytes = memory_limit_mb * 1024 * 1024

    resource.setrlimit(resource.RLIMIT_DATA, (memory_bytes, memory_bytes))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_NOFILE, (32, 32))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
