"""Автоматическое определение типа файла, кодировки и разделителя."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


@dataclass(frozen=True)
class FileInfo:
    """Определенные свойства текстовой таблицы."""

    path: Path
    file_type: str
    encoding: str
    delimiter: str


class FileDetector:
    """Определяет параметры поддерживаемых инженерных табличных файлов."""

    _comment_prefixes = ("#", "//", "%")
    _encodings = ("utf-8-sig", "utf-8", "cp1251", "mbcs", "cp1252")

    def detect(self, path: Path | str) -> FileInfo:
        """Определить поддерживаемые параметры файла."""
        resolved = Path(path).expanduser().resolve()
        encoding = self.detect_encoding(resolved)
        text = resolved.read_text(encoding=encoding)
        delimiter = self.detect_delimiter(text)
        return FileInfo(
            path=resolved,
            file_type=resolved.suffix.lower().lstrip("."),
            encoding=encoding,
            delimiter=delimiter,
        )

    def detect_encoding(self, path: Path | str) -> str:
        """Определить кодировку текста перебором поддерживаемого списка."""
        data = Path(path).read_bytes()
        for encoding in self._encodings:
            try:
                data.decode(encoding)
                return encoding
            except (LookupError, UnicodeDecodeError):
                continue
        return "utf-8"

    def detect_delimiter(self, text: str) -> str:
        """Определить разделитель по непустым строкам без комментариев."""
        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip() and not self._is_comment(line)
        ]
        sample = lines[:10]
        if not sample:
            return "whitespace"

        candidates = {
            ",": ",",
            ";": ";",
            "\t": "\t",
        }
        scores: dict[str, int] = {}
        for delimiter, token in candidates.items():
            counts = [len(line.split(token)) for line in sample]
            scores[delimiter] = self._score_counts(counts)

        whitespace_counts = [len(re.split(r" +", line.strip())) for line in sample]
        scores["space"] = self._score_counts(whitespace_counts)

        return max(scores, key=scores.get)

    def _score_counts(self, counts: list[int]) -> int:
        """Оценить разделитель по стабильности количества столбцов."""
        useful = [count for count in counts if count > 1]
        if not useful:
            return 0
        return min(useful) * len(useful) - (max(useful) - min(useful))

    def _is_comment(self, line: str) -> bool:
        """Вернуть ``True``, если строка начинается с поддерживаемого маркера комментария."""
        stripped = line.lstrip()
        return any(stripped.startswith(prefix) for prefix in self._comment_prefixes)
