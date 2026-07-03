"""Управление жизненным циклом проекта."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
from pathlib import Path
from typing import Any

from .logger import Logger
from .workspace import Workspace


@dataclass
class Project:
    """Сериализуемое состояние проекта."""

    name: str
    workspace: Workspace = field(default_factory=Workspace)
    datasets: list[str] = field(default_factory=list)
    graphs: list[dict[str, Any]] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    scene_objects: list[dict[str, Any]] = field(default_factory=list)
    animations: list[dict[str, Any]] = field(default_factory=list)
    settings: dict[str, Any] = field(default_factory=dict)


class ProjectManager:
    """Создает, открывает, сохраняет и закрывает проекты."""

    def __init__(self, logger: Logger | None = None) -> None:
        """Создать менеджер проектов."""
        self._logger = logger or Logger()
        self._project: Project | None = None

    @property
    def current_project(self) -> Project | None:
        """Вернуть текущий открытый проект."""
        return self._project

    def create(self, name: str, root_path: Path | str | None = None) -> Project:
        """Создать новый проект в памяти."""
        workspace = Workspace(root_path=Path(root_path).resolve() if root_path else None)
        self._project = Project(name=name, workspace=workspace)
        self._logger.info(f"Проект создан: {name}")
        return self._project

    def open(self, path: Path | str) -> Project:
        """Открыть проект из JSON-файла."""
        resolved = Path(path).expanduser().resolve()
        with resolved.open("r", encoding="utf-8") as stream:
            payload = json.load(stream)

        workspace_payload = payload.get("workspace", {})
        workspace = Workspace(
            root_path=self._to_path(workspace_payload.get("root_path")),
            project_path=resolved,
            dataset_ids=list(workspace_payload.get("dataset_ids", [])),
            graph_ids=list(workspace_payload.get("graph_ids", [])),
            table_ids=list(workspace_payload.get("table_ids", [])),
            scene_object_ids=list(workspace_payload.get("scene_object_ids", [])),
            animation_ids=list(workspace_payload.get("animation_ids", [])),
            settings=dict(workspace_payload.get("settings", {})),
        )
        self._project = Project(
            name=str(payload.get("name", resolved.stem)),
            workspace=workspace,
            datasets=list(payload.get("datasets", [])),
            graphs=list(payload.get("graphs", [])),
            tables=list(payload.get("tables", [])),
            scene_objects=list(payload.get("scene_objects", [])),
            animations=list(payload.get("animations", [])),
            settings=dict(payload.get("settings", {})),
        )
        self._logger.info(f"Проект открыт: {resolved}")
        return self._project

    def save(self, path: Path | str | None = None) -> Path:
        """Сохранить текущий проект на диск."""
        if self._project is None:
            raise RuntimeError("Нет открытого проекта.")

        target = Path(path).expanduser().resolve() if path else self._project.workspace.project_path
        if target is None:
            raise ValueError("Путь к проекту не указан.")

        payload = asdict(self._project)
        payload["workspace"]["root_path"] = self._path_to_string(
            self._project.workspace.root_path
        )
        payload["workspace"]["project_path"] = self._path_to_string(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8") as stream:
            json.dump(payload, stream, ensure_ascii=True, indent=2)
        self._project.workspace.project_path = target
        self._logger.info(f"Проект сохранен: {target}")
        return target

    def close(self) -> None:
        """Закрыть текущий проект."""
        if self._project is not None:
            self._logger.info(f"Проект закрыт: {self._project.name}")
        self._project = None

    def _to_path(self, value: str | None) -> Path | None:
        """Преобразовать сериализованный путь в ``Path``."""
        return Path(value).expanduser().resolve() if value else None

    def _path_to_string(self, value: Path | None) -> str | None:
        """Преобразовать путь в значение, совместимое с JSON."""
        return str(value) if value is not None else None
