"""Фасад журналирования для пакета ядра."""

from __future__ import annotations

import logging
from pathlib import Path


class Logger:
    """Небольшая обертка над стандартным модулем logging.

    Класс исключает прямые вызовы ``print`` и дает остальной части ядра
    стабильную зависимость для журналирования, которую при необходимости
    можно заменить на уровне интерфейса.
    """

    def __init__(
        self,
        name: str = "TrajectoryVisualizer",
        level: int = logging.INFO,
        log_file: Path | str | None = None,
    ) -> None:
        """Создать фасад журналирования.

        Args:
            name: Имя логгера, используемое стандартной библиотекой.
            level: Минимальный уровень журналирования.
            log_file: Необязательный путь к файлу для постоянной записи журнала.
        """
        self._logger = logging.getLogger(name)
        self._logger.setLevel(level)
        self._logger.propagate = False

        if not self._logger.handlers:
            formatter = logging.Formatter(
                "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
            )
            handler: logging.Handler
            if log_file is None:
                handler = logging.StreamHandler()
            else:
                path = Path(log_file)
                path.parent.mkdir(parents=True, exist_ok=True)
                handler = logging.FileHandler(path, encoding="utf-8")
            handler.setFormatter(formatter)
            self._logger.addHandler(handler)

    def set_level(self, level: int) -> None:
        """Установить минимальный уровень журналирования."""
        self._logger.setLevel(level)

    def info(self, message: str) -> None:
        """Записать информационное сообщение."""
        self._logger.info(message)

    def warning(self, message: str) -> None:
        """Записать предупреждение."""
        self._logger.warning(message)

    def error(self, message: str) -> None:
        """Записать сообщение об ошибке."""
        self._logger.error(message)

    def debug(self, message: str) -> None:
        """Записать отладочное сообщение."""
        self._logger.debug(message)
