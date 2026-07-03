"""Хранение описаний открытых таблиц без зависимостей от GUI."""

from __future__ import annotations

from dataclasses import dataclass, field

from .utils import make_identifier


@dataclass
class TableDescription:
    """Описание табличного представления."""

    dataset_id: str
    columns: list[str] = field(default_factory=list)
    title: str | None = None
    identifier: str = field(default_factory=lambda: make_identifier("table"))


class TableManager:
    """Регистрирует и управляет описаниями таблиц."""

    def __init__(self) -> None:
        """Создать пустой реестр таблиц."""
        self._tables: dict[str, TableDescription] = {}

    def create(self, table: TableDescription) -> str:
        """Зарегистрировать описание таблицы."""
        self._tables[table.identifier] = table
        return table.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить описание таблицы."""
        return self._tables.pop(identifier, None) is not None

    def get(self, identifier: str) -> TableDescription:
        """Вернуть описание таблицы."""
        return self._tables[identifier]

    def list(self) -> list[TableDescription]:
        """Вернуть все описания таблиц."""
        return list(self._tables.values())
