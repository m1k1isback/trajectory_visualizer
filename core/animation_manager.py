"""Описания состояний анимации без зависимостей от визуализации."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum

from .utils import make_identifier


class PlaybackState(StrEnum):
    """Состояние воспроизведения анимации."""

    STOPPED = "stopped"
    PLAYING = "playing"
    PAUSED = "paused"


@dataclass
class AnimationDescription:
    """Описание одной анимации."""

    name: str
    dataset_id: str
    speed: float = 1.0
    current_time: float = 0.0
    mode: str = "once"
    state: PlaybackState = PlaybackState.STOPPED
    identifier: str = field(default_factory=lambda: make_identifier("animation"))


class AnimationManager:
    """Регистрирует и обновляет описания анимаций."""

    def __init__(self) -> None:
        """Создать пустой реестр анимаций."""
        self._animations: dict[str, AnimationDescription] = {}

    def create(self, animation: AnimationDescription) -> str:
        """Зарегистрировать описание анимации."""
        self._animations[animation.identifier] = animation
        return animation.identifier

    def remove(self, identifier: str) -> bool:
        """Удалить описание анимации."""
        return self._animations.pop(identifier, None) is not None

    def get(self, identifier: str) -> AnimationDescription:
        """Вернуть описание анимации."""
        return self._animations[identifier]

    def list(self) -> list[AnimationDescription]:
        """Вернуть все описания анимаций."""
        return list(self._animations.values())
