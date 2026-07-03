"""Обнаружение плагинов и загрузка их описаний."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PluginDescription:
    """Загруженные метаданные плагина."""

    name: str
    path: Path
    metadata: dict[str, Any]


class PluginManager:
    """Обнаруживает описания плагинов без выполнения их кода."""

    def __init__(self, plugins_path: Path | str) -> None:
        """Создать менеджер плагинов для одного каталога плагинов."""
        self._plugins_path = Path(plugins_path).expanduser().resolve()
        self._plugins: dict[str, PluginDescription] = {}

    def discover(self) -> list[PluginDescription]:
        """Обнаружить файлы метаданных плагинов."""
        self._plugins.clear()
        if not self._plugins_path.exists():
            return []

        for manifest in self._plugins_path.glob("*/plugin.json"):
            description = self._load_manifest(manifest)
            self._plugins[description.name] = description
        return list(self._plugins.values())

    def get(self, name: str) -> PluginDescription:
        """Вернуть описание обнаруженного плагина."""
        return self._plugins[name]

    def list(self) -> list[PluginDescription]:
        """Вернуть все описания обнаруженных плагинов."""
        return list(self._plugins.values())

    def _load_manifest(self, manifest: Path) -> PluginDescription:
        """Загрузить один манифест плагина."""
        with manifest.open("r", encoding="utf-8") as stream:
            metadata = json.load(stream)
        name = str(metadata.get("name") or manifest.parent.name)
        return PluginDescription(name=name, path=manifest.parent, metadata=metadata)
