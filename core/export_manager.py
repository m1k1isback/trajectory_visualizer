"""Архитектурная заготовка для будущих операций экспорта."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .utils import make_identifier


@dataclass
class ExportTask:
    """Описание будущей операции экспорта."""

    export_type: str
    target_path: Path
    source_id: str
    options: dict[str, Any] = field(default_factory=dict)
    identifier: str = field(default_factory=lambda: make_identifier("export"))


class ExportManager:
    """Хранит описания задач экспорта без записи файлов."""

    def __init__(self) -> None:
        """Создать пустой реестр задач экспорта."""
        self._tasks: dict[str, ExportTask] = {}

    def register(self, task: ExportTask) -> str:
        """Зарегистрировать описание задачи экспорта."""
        self._tasks[task.identifier] = task
        return task.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить описание задачи экспорта."""
        return self._tasks.pop(identifier, None) is not None

    def get(self, identifier: str) -> ExportTask:
        """Вернуть описание задачи экспорта."""
        return self._tasks[identifier]

    def list(self) -> list[ExportTask]:
        """Вернуть все описания задач экспорта."""
        return list(self._tasks.values())
