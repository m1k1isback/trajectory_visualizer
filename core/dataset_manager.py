"""Менеджер хранения объектов Dataset."""

from __future__ import annotations

from .data_loader import Dataset


class DatasetManager:
    """Регистрирует, удаляет, ищет и перечисляет наборы данных."""

    def __init__(self) -> None:
        """Создать пустой реестр наборов данных."""
        self._datasets: dict[str, Dataset] = {}

    def register(self, dataset: Dataset) -> str:
        """Зарегистрировать набор данных и вернуть его идентификатор."""
        self._datasets[dataset.identifier] = dataset
        return dataset.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить набор данных по идентификатору."""
        return self._datasets.pop(identifier, None) is not None

    def get(self, identifier: str) -> Dataset:
        """Вернуть набор данных по идентификатору."""
        return self._datasets[identifier]

    def find_by_name(self, name: str) -> list[Dataset]:
        """Найти наборы данных с указанным именем."""
        return [dataset for dataset in self._datasets.values() if dataset.name == name]

    def list(self) -> list[Dataset]:
        """Вернуть все зарегистрированные наборы данных."""
        return list(self._datasets.values())
