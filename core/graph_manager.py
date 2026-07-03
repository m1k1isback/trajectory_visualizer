"""Хранение описаний графиков без зависимостей от отрисовки."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .utils import make_identifier


@dataclass
class CurveDescription:
    """Описание одной кривой на графике."""

    dataset_id: str
    x_variable: str
    y_variable: str
    color: str | None = None
    legend: str | None = None
    axis: str | None = None


@dataclass
class GraphDescription:
    """Конфигурация графика, хранимая в ядре."""

    title: str
    curves: list[CurveDescription] = field(default_factory=list)
    axes: dict[str, Any] = field(default_factory=dict)
    identifier: str = field(default_factory=lambda: make_identifier("graph"))


class GraphManager:
    """Регистрирует и управляет описаниями графиков."""

    def __init__(self) -> None:
        """Создать пустой реестр графиков."""
        self._graphs: dict[str, GraphDescription] = {}

    def create(self, graph: GraphDescription) -> str:
        """Зарегистрировать описание графика."""
        self._graphs[graph.identifier] = graph
        return graph.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить описание графика."""
        return self._graphs.pop(identifier, None) is not None

    def get(self, identifier: str) -> GraphDescription:
        """Вернуть описание графика."""
        return self._graphs[identifier]

    def list(self) -> list[GraphDescription]:
        """Вернуть все описания графиков."""
        return list(self._graphs.values())
