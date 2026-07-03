"""Вспомогательные средства проверки загруженных наборов данных."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
import math

import numpy as np

from .data_loader import Dataset


class Severity(StrEnum):
    """Уровень важности сообщения проверки."""

    ERROR = "ERROR"
    WARNING = "WARNING"


@dataclass(frozen=True)
class ValidationMessage:
    """Одно сообщение проверки."""

    severity: Severity
    code: str
    message: str


@dataclass
class ValidationResult:
    """Результат проверки со всеми собранными сообщениями."""

    messages: list[ValidationMessage] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        """Вернуть ``True``, если ошибок нет."""
        return all(message.severity != Severity.ERROR for message in self.messages)

    def add(self, severity: Severity, code: str, message: str) -> None:
        """Добавить сообщение проверки."""
        self.messages.append(ValidationMessage(severity, code, message))


class DatasetValidator:
    """Проверяет содержимое Dataset без его изменения."""

    def validate(self, dataset: Dataset) -> ValidationResult:
        """Выполнить все проверки набора данных."""
        result = ValidationResult()
        self._check_shape(dataset, result)
        self._check_names(dataset, result)
        self._check_values(dataset, result)
        self._check_argument(dataset, result)
        self._check_invalid_tokens(dataset, result)
        return result

    def _check_shape(self, dataset: Dataset, result: ValidationResult) -> None:
        """Проверить базовую структуру таблицы."""
        if dataset.row_count == 0:
            result.add(Severity.ERROR, "EMPTY_FILE", "Файл не содержит строк данных.")
        if dataset.column_count == 0 or not dataset.column_names:
            result.add(Severity.ERROR, "NO_HEADERS", "Файл не содержит заголовков.")
        if dataset.column_count > 0 and dataset.column_count != len(dataset.column_names):
            result.add(
                Severity.ERROR,
                "STRUCTURE",
                "Количество столбцов не соответствует количеству заголовков.",
            )
        malformed_rows = dataset.metadata.get("malformed_rows", [])
        if malformed_rows:
            result.add(
                Severity.WARNING,
                "STRUCTURE",
                f"Найдены строки с неожиданным количеством столбцов: {len(malformed_rows)}.",
            )

    def _check_names(self, dataset: Dataset, result: ValidationResult) -> None:
        """Проверить имена столбцов."""
        if not dataset.argument_name:
            result.add(Severity.ERROR, "NO_ARGUMENT", "Столбец аргумента отсутствует.")

        duplicate_names = dataset.metadata.get("duplicate_column_names", [])
        if duplicate_names:
            joined = ", ".join(str(name) for name in duplicate_names)
            result.add(
                Severity.WARNING,
                "DUPLICATE_COLUMNS",
                f"Повторяющиеся имена столбцов были переименованы: {joined}.",
            )

        if dataset.column_names and all(self._looks_numeric(name) for name in dataset.column_names):
            result.add(
                Severity.ERROR,
                "NO_HEADERS",
                "Строка заголовка отсутствует или похожа на числовые данные.",
            )

        seen: set[str] = set()
        duplicates: set[str] = set()
        for name in dataset.column_names:
            if name in seen:
                duplicates.add(name)
            seen.add(name)
        if duplicates:
            joined = ", ".join(sorted(duplicates))
            result.add(
                Severity.WARNING,
                "DUPLICATE_COLUMNS",
                f"Найдены повторяющиеся имена столбцов: {joined}.",
            )

    def _check_values(self, dataset: Dataset, result: ValidationResult) -> None:
        """Проверить NaN, Inf и не конечные значения."""
        if dataset.data.size == 0:
            return

        nan_count = int(np.isnan(dataset.data).sum())
        inf_count = int(np.isinf(dataset.data).sum())
        if nan_count:
            result.add(Severity.WARNING, "NAN", f"Найдены значения NaN: {nan_count}.")
        if inf_count:
            result.add(Severity.WARNING, "INF", f"Найдены значения Inf: {inf_count}.")

    def _check_argument(self, dataset: Dataset, result: ValidationResult) -> None:
        """Проверить монотонность аргумента."""
        if dataset.column_count == 0 or dataset.row_count < 2:
            return
        argument = dataset.argument_values
        finite = argument[np.isfinite(argument)]
        if finite.size < 2:
            return
        differences = np.diff(finite)
        if not bool(np.all(differences > 0) or np.all(differences < 0)):
            result.add(
                Severity.WARNING,
                "NON_MONOTONIC_ARGUMENT",
                "Столбец аргумента не является строго монотонным.",
            )

    def _check_invalid_tokens(self, dataset: Dataset, result: ValidationResult) -> None:
        """Сообщить о токенах, которые не удалось преобразовать в числа."""
        invalid_values = dataset.metadata.get("invalid_values", [])
        if invalid_values:
            result.add(
                Severity.WARNING,
                "NON_NUMERIC",
                f"Найдены нечисловые значения: {len(invalid_values)}.",
            )

    def _looks_numeric(self, value: str) -> bool:
        """Вернуть ``True``, если ячейка заголовка похожа на число."""
        try:
            float(value.replace(",", "."))
            return True
        except ValueError:
            return False


def is_finite_number(value: float) -> bool:
    """Вернуть ``True`` для конечных числовых значений."""
    return math.isfinite(value)
