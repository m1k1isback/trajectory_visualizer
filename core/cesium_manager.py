"""Описания объектов сцены без зависимости от Cesium."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Dict

from .data_loader import Dataset
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
    """Хранит только описания объектов сцены и извлекает траектории."""

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

    def extract_trajectory(self, dataset: Dataset) -> list[dict[str, float]]:
        """
        Извлечь координаты траектории из Dataset.

        Ищет колонки x, y, z (регистр не важен) и возвращает список точек.
        Координаты должны быть в декартовой системе (метры).

        Args:
            dataset: Объект Dataset с числовыми данными

        Returns:
            Список точек: [{'x': x1, 'y': y1, 'z': z1}, ...]

        Raises:
            ValueError: если не найдены все три координаты
        """
        # Нормализуем имена колонок для поиска
        col_map: dict[str, str] = {}
        for col in dataset.column_names:
            col_lower = col.lower().strip()
            col_map[col_lower] = col

        # Ищем x, y, z
        x_col = col_map.get('x')
        y_col = col_map.get('y')
        z_col = col_map.get('z')

        if not all([x_col, y_col, z_col]):
            raise ValueError(
                f"Не найдены все координаты. "
                f"Найдено: x={x_col}, y={y_col}, z={z_col}. "
                f"Доступные колонки: {dataset.column_names}"
            )

        # Получаем столбцы как numpy массивы
        x_values = dataset.get_column(x_col)
        y_values = dataset.get_column(y_col)
        z_values = dataset.get_column(z_col)

        # Создаём список точек
        trajectory: List[Dict[str, float]] = []
        num_points = len(x_values)

        for i in range(num_points):
            try:
                x_val = float(x_values[i])
                y_val = float(y_values[i])
                z_val = float(z_values[i])

                # Пропускаем NaN значения
                import numpy as np
                if np.isnan(x_val) or np.isnan(y_val) or np.isnan(z_val):
                    continue

                trajectory.append({
                    'x': x_val,
                    'y': y_val,
                    'z': z_val
                })
            except (ValueError, TypeError, IndexError):
                continue

        return trajectory