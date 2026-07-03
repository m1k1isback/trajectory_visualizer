"""Контейнер состояния проекта, независимый от GUI."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Workspace:
    """Состояние текущего открытого проекта."""

    root_path: Path | None = None
    project_path: Path | None = None
    dataset_ids: list[str] = field(default_factory=list)
    graph_ids: list[str] = field(default_factory=list)
    table_ids: list[str] = field(default_factory=list)
    scene_object_ids: list[str] = field(default_factory=list)
    animation_ids: list[str] = field(default_factory=list)
    settings: dict[str, Any] = field(default_factory=dict)

    def clear(self) -> None:
        """Сбросить состояние рабочего пространства."""
        self.project_path = None
        self.dataset_ids.clear()
        self.graph_ids.clear()
        self.table_ids.clear()
        self.scene_object_ids.clear()
        self.animation_ids.clear()
        self.settings.clear()
