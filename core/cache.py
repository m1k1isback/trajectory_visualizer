"""Кэш загруженных наборов данных в оперативной памяти."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Generic, TypeVar

from .utils import normalize_path


T = TypeVar("T")


@dataclass(frozen=True)
class CacheKey:
    """Идентификатор файла для обнаружения повторного чтения тех же данных."""

    path: Path
    modified_ns: int
    size: int


class FileCache(Generic[T]):
    """Кэширует значения по пути файла, времени изменения и размеру."""

    def __init__(self) -> None:
        """Создать пустой кэш."""
        self._items: dict[CacheKey, T] = {}

    def build_key(self, path: Path | str) -> CacheKey:
        """Сформировать ключ кэша для существующего файла."""
        resolved = normalize_path(path)
        stat = resolved.stat()
        return CacheKey(
            path=resolved,
            modified_ns=stat.st_mtime_ns,
            size=stat.st_size,
        )

    def get(self, key: CacheKey) -> T | None:
        """Вернуть элемент из кэша или ``None``."""
        return self._items.get(key)

    def set(self, key: CacheKey, value: T) -> None:
        """Сохранить значение в кэше."""
        self._items[key] = value

    def remove_path(self, path: Path | str) -> None:
        """Удалить все записи кэша для указанного пути."""
        resolved = normalize_path(path)
        self._items = {
            key: value for key, value in self._items.items() if key.path != resolved
        }

    def clear(self) -> None:
        """Удалить все закэшированные значения."""
        self._items.clear()
