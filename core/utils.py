"""Небольшие вспомогательные функции для независимых модулей ядра."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4


def make_identifier(prefix: str) -> str:
    """Создать компактный достаточно устойчивый идентификатор для сущностей в памяти."""
    return f"{prefix}_{uuid4().hex}"


def normalize_path(path: Path | str) -> Path:
    """Вернуть абсолютный нормализованный путь без требования его существования."""
    return Path(path).expanduser().resolve()


def make_unique_names(names: list[str]) -> list[str]:
    """Вернуть имена, где повторы получают суффиксы ``_2``, ``_3``."""
    counters: dict[str, int] = {}
    unique_names: list[str] = []

    for raw_name in names:
        name = raw_name.strip() or "Column"
        count = counters.get(name, 0) + 1
        counters[name] = count
        unique_names.append(name if count == 1 else f"{name}_{count}")

    return unique_names
