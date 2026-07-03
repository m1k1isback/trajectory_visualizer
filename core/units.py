"""Утилиты для разбора имен переменных с единицами измерения."""

from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class UnitName:
    """Имя столбца, разделенное на чистое имя и необязательную единицу."""

    name: str
    unit: str | None


class UnitParser:
    """Разбирает единицы, записанные в виде ``Имя [единица]``."""

    _pattern = re.compile(r"^\s*(?P<name>.*?)\s*(?:\[(?P<unit>[^\]]+)\])?\s*$")

    def parse(self, value: str) -> UnitName:
        """Разделить исходную ячейку заголовка на имя и единицу."""
        match = self._pattern.match(value)
        if match is None:
            return UnitName(name=value.strip(), unit=None)

        name = match.group("name").strip()
        unit = match.group("unit")
        return UnitName(name=name, unit=unit.strip() if unit else None)
