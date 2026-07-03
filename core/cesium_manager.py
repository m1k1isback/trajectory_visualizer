"""Описания объектов сцены без зависимости от Cesium."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .utils import make_identifier


@dataclass
class SceneObjectDescription:
    """Описание объекта сцены: траектории, точки, маркера и подобных сущностей."""

    object_type: str
    name: str
    dataset_id: str | None = None
    properties: dict[str, Any] = field(default_factory=dict)
    identifier: str = field(default_factory=lambda: make_identifier("scene"))


class CesiumManager:
    """Хранит только описания объектов сцены."""

    def __init__(self) -> None:
        """Создать пустой реестр объектов сцены."""
        self._objects: dict[str, SceneObjectDescription] = {}

    def add(self, scene_object: SceneObjectDescription) -> str:
        """Зарегистрировать описание объекта сцены."""
        self._objects[scene_object.identifier] = scene_object
        return scene_object.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить описание объекта сцены."""
        return self._objects.pop(identifier, None) is not None

    def get(self, identifier: str) -> SceneObjectDescription:
        """Вернуть описание объекта сцены."""
        return self._objects[identifier]

    def list(self) -> list[SceneObjectDescription]:
        """Вернуть все описания объектов сцены."""
        return list(self._objects.values())
