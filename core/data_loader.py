"""Загрузчик текстовых таблиц, возвращающий независимые объекты Dataset."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import re
from typing import Any

import numpy as np

from .cache import FileCache
from .file_detector import FileDetector, FileInfo
from .logger import Logger
from .units import UnitParser
from .utils import make_identifier, make_unique_names, normalize_path


@dataclass(slots=True)
class Dataset:
    """Числовой набор данных, загруженный из табличного файла.

    Первый столбец считается аргументом. Остальные столбцы являются
    переменными. Числовые значения хранятся только в массивах NumPy.
    """

    name: str
    data: np.ndarray
    column_names: list[str]
    units: dict[str, str | None]
    argument_name: str
    source_path: Path | None = None
    identifier: str = field(default_factory=lambda: make_identifier("dataset"))
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def row_count(self) -> int:
        """Вернуть количество строк."""
        return int(self.data.shape[0])

    @property
    def column_count(self) -> int:
        """Вернуть количество столбцов."""
        return int(self.data.shape[1])

    @property
    def variable_names(self) -> list[str]:
        """Вернуть имена столбцов переменных."""
        return self.column_names[1:]

    @property
    def argument_values(self) -> np.ndarray:
        """Вернуть значения столбца аргумента."""
        return self.data[:, 0]

    def get_column(self, name: str) -> np.ndarray:
        """Вернуть столбец по имени."""
        index = self.column_names.index(name)
        return self.data[:, index]


class DataLoader:
    """Загружает файлы TXT, CSV, TSV и DAT в объекты Dataset."""

    _comment_prefixes = ("#", "//", "%")

    def __init__(
        self,
        detector: FileDetector | None = None,
        cache: FileCache[Dataset] | None = None,
        logger: Logger | None = None,
    ) -> None:
        """Создать загрузчик с явно переданными зависимостями."""
        self._detector = detector or FileDetector()
        self._cache = cache or FileCache[Dataset]()
        self._logger = logger or Logger()
        self._unit_parser = UnitParser()

    def load(self, path: Path | str) -> Dataset:
        """Загрузить файл и вернуть Dataset."""
        resolved = normalize_path(path)
        key = self._cache.build_key(resolved)
        cached = self._cache.get(key)
        if cached is not None:
            self._logger.debug(f"Dataset загружен из кэша: {resolved}")
            return cached

        info = self._detector.detect(resolved)
        lines = self._read_content(info)
        if not lines:
            dataset = self._empty_dataset(resolved, info)
            self._cache.set(key, dataset)
            return dataset

        headers, units, original_names, duplicate_names = self._parse_header(
            lines[0],
            info.delimiter,
        )
        rows, invalid_values, malformed_rows = self._parse_rows(
            lines[1:],
            info.delimiter,
            len(headers),
        )
        dataset = Dataset(
            name=resolved.stem,
            data=rows,
            column_names=headers,
            units=units,
            argument_name=headers[0] if headers else "",
            source_path=resolved,
            metadata={
                "encoding": info.encoding,
                "delimiter": info.delimiter,
                "file_type": info.file_type,
                "original_column_names": original_names,
                "duplicate_column_names": duplicate_names,
                "invalid_values": invalid_values,
                "malformed_rows": malformed_rows,
            },
        )
        self._cache.set(key, dataset)
        self._logger.info(f"Dataset загружен: {resolved}")
        return dataset

    def _read_content(self, info: FileInfo) -> list[str]:
        """Прочитать значимые строки файла без комментариев и пустых строк."""
        text = info.path.read_text(encoding=info.encoding)
        return [
            line.strip()
            for line in text.splitlines()
            if line.strip() and not self._is_comment(line)
        ]

    def _parse_header(
        self,
        raw_header: str,
        delimiter: str,
    ) -> tuple[list[str], dict[str, str | None], list[str], list[str]]:
        """Разобрать ячейки заголовка и сделать повторяющиеся имена уникальными."""
        raw_names = self._split_header(raw_header, delimiter)
        parsed = [self._unit_parser.parse(name) for name in raw_names]
        original_names = [item.name for item in parsed]
        duplicate_names = self._find_duplicates(original_names)
        names = make_unique_names(original_names)
        units: dict[str, str | None] = {}
        for name, item in zip(names, parsed, strict=False):
            units[name] = item.unit
        return names, units, original_names, duplicate_names

    def _parse_rows(
        self,
        lines: list[str],
        delimiter: str,
        expected_columns: int,
    ) -> tuple[np.ndarray, list[dict[str, Any]], list[dict[str, int]]]:
        """Разобрать строки числовых данных в массив NumPy."""
        rows: list[list[float]] = []
        invalid_values: list[dict[str, Any]] = []
        malformed_rows: list[dict[str, int]] = []

        for row_index, line in enumerate(lines, start=2):
            tokens = self._split_line(line, delimiter)
            if len(tokens) != expected_columns:
                malformed_rows.append(
                    {
                        "row": row_index,
                        "actual_columns": len(tokens),
                        "expected_columns": expected_columns,
                    }
                )
            values: list[float] = []
            for column_index in range(expected_columns):
                token = tokens[column_index] if column_index < len(tokens) else ""
                try:
                    values.append(self._parse_float(token, delimiter))
                except ValueError:
                    values.append(np.nan)
                    invalid_values.append(
                        {
                            "row": row_index,
                            "column": column_index + 1,
                            "value": token,
                        }
                    )
            rows.append(values)

        if not rows:
            return (
                np.empty((0, expected_columns), dtype=float),
                invalid_values,
                malformed_rows,
            )
        return np.asarray(rows, dtype=float), invalid_values, malformed_rows

    def _split_line(self, line: str, delimiter: str) -> list[str]:
        """Разделить одну строку текстовой таблицы."""
        if delimiter == "\t":
            return [value.strip() for value in line.split("\t")]
        if delimiter in {",", ";"}:
            return [value.strip() for value in line.split(delimiter)]
        return [value.strip() for value in re.split(r" +", line.strip())]

    def _split_header(self, line: str, delimiter: str) -> list[str]:
        """Разделить строку заголовка, сохраняя единицы в скобках рядом с именами."""
        values = self._split_line(line, delimiter)
        if delimiter != "space":
            return values

        # В таблицах с пробелами единицы часто записывают так: Время [s] Высота [m].
        merged: list[str] = []
        for value in values:
            if value.startswith("[") and value.endswith("]") and merged:
                merged[-1] = f"{merged[-1]} {value}"
            else:
                merged.append(value)
        return merged

    def _parse_float(self, token: str, delimiter: str) -> float:
        """Разобрать один числовой токен без изменения смысла данных."""
        normalized = token.strip()
        if delimiter != "," and "," in normalized and "." not in normalized:
            normalized = normalized.replace(",", ".")
        return float(normalized)

    def _find_duplicates(self, names: list[str]) -> list[str]:
        """Вернуть повторяющиеся имена из исходного заголовка."""
        seen: set[str] = set()
        duplicates: list[str] = []
        for name in names:
            if name in seen and name not in duplicates:
                duplicates.append(name)
            seen.add(name)
        return duplicates

    def _empty_dataset(self, path: Path, info: FileInfo) -> Dataset:
        """Создать пустой Dataset для последующей диагностики валидатором."""
        return Dataset(
            name=path.stem,
            data=np.empty((0, 0), dtype=float),
            column_names=[],
            units={},
            argument_name="",
            source_path=path,
            metadata={
                "encoding": info.encoding,
                "delimiter": info.delimiter,
                "file_type": info.file_type,
                "original_column_names": [],
                "duplicate_column_names": [],
                "invalid_values": [],
                "malformed_rows": [],
            },
        )

    def _is_comment(self, line: str) -> bool:
        """Вернуть ``True`` для поддерживаемых строк комментариев."""
        stripped = line.lstrip()
        return any(stripped.startswith(prefix) for prefix in self._comment_prefixes)
