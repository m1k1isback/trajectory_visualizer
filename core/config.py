"""Чтение и запись настроек приложения."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class Config:
    """Хранилище настроек ядра на основе JSON."""

    def __init__(self, path: Path | str) -> None:
        """Создать объект конфигурации, связанный с путем к файлу."""
        self._path = Path(path).expanduser().resolve()
        self._values: dict[str, Any] = {}

    @property
    def path(self) -> Path:
        """Вернуть путь к файлу конфигурации."""
        return self._path

    def load(self) -> dict[str, Any]:
        """Загрузить настройки с диска."""
        if not self._path.exists():
            self._values = {}
            return dict(self._values)

        with self._path.open("r", encoding="utf-8") as stream:
            loaded = json.load(stream)
        self._values = loaded if isinstance(loaded, dict) else {}
        return dict(self._values)

    def save(self) -> None:
        """Сохранить текущие настройки на диск."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._path.open("w", encoding="utf-8") as stream:
            json.dump(self._values, stream, ensure_ascii=True, indent=2)

    def get(self, key: str, default: Any = None) -> Any:
        """Вернуть значение одной настройки."""
        return self._values.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Установить значение одной настройки."""
        self._values[key] = value

    def as_dict(self) -> dict[str, Any]:
        """Вернуть копию всех настроек."""
        return dict(self._values)
