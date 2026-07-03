"""Числовая статистика для объектов Dataset."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .data_loader import Dataset


@dataclass(frozen=True)
class ColumnStatistics:
    """Статистика для одного столбца набора данных."""

    name: str
    minimum: float
    maximum: float
    mean: float
    rms: float
    standard_deviation: float
    nan_count: int
    inf_count: int


@dataclass(frozen=True)
class DatasetStatistics:
    """Статистика для всего набора данных."""

    row_count: int
    column_count: int
    columns: dict[str, ColumnStatistics]


class Statistics:
    """Рассчитывает числовую статистику без изменения данных."""

    def calculate(self, dataset: Dataset) -> DatasetStatistics:
        """Рассчитать всю поддерживаемую статистику набора данных."""
        columns: dict[str, ColumnStatistics] = {}
        for index, name in enumerate(dataset.column_names):
            values = dataset.data[:, index] if dataset.row_count else np.array([])
            columns[name] = self._calculate_column(name, values)
        return DatasetStatistics(
            row_count=dataset.row_count,
            column_count=dataset.column_count,
            columns=columns,
        )

    def _calculate_column(self, name: str, values: np.ndarray) -> ColumnStatistics:
        """Рассчитать статистику для одного столбца."""
        finite = values[np.isfinite(values)]
        if finite.size == 0:
            minimum = maximum = mean = rms = standard_deviation = float("nan")
        else:
            minimum = float(np.min(finite))
            maximum = float(np.max(finite))
            mean = float(np.mean(finite))
            rms = float(np.sqrt(np.mean(np.square(finite))))
            standard_deviation = float(np.std(finite))

        return ColumnStatistics(
            name=name,
            minimum=minimum,
            maximum=maximum,
            mean=mean,
            rms=rms,
            standard_deviation=standard_deviation,
            nan_count=int(np.isnan(values).sum()),
            inf_count=int(np.isinf(values).sum()),
        )
