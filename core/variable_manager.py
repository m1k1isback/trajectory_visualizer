"""Общий для проекта реестр переменных наборов данных."""

from __future__ import annotations

from dataclasses import dataclass

from .data_loader import Dataset


@dataclass(frozen=True)
class VariableRef:
    """Ссылка на переменную внутри набора данных."""

    full_name: str
    dataset_id: str
    dataset_name: str
    variable_name: str
    unit: str | None


class VariableManager:
    """Хранит все переменные проекта в одном месте."""

    def __init__(self) -> None:
        """Создать пустой реестр."""
        self._variables: dict[str, VariableRef] = {}

    def register_dataset(self, dataset: Dataset) -> list[VariableRef]:
        """Зарегистрировать все переменные из набора данных."""
        registered: list[VariableRef] = []
        for variable_name in dataset.variable_names:
            full_name = f"{dataset.name}.{variable_name}"
            reference = VariableRef(
                full_name=full_name,
                dataset_id=dataset.identifier,
                dataset_name=dataset.name,
                variable_name=variable_name,
                unit=dataset.units.get(variable_name),
            )
            self._variables[full_name] = reference
            registered.append(reference)
        return registered

    def remove_dataset(self, dataset_id: str) -> None:
        """Удалить переменные, принадлежащие набору данных."""
        self._variables = {
            name: variable
            for name, variable in self._variables.items()
            if variable.dataset_id != dataset_id
        }

    def get(self, full_name: str) -> VariableRef:
        """Вернуть ссылку на переменную по полному имени."""
        return self._variables[full_name]

    def list(self) -> list[VariableRef]:
        """Вернуть все ссылки на переменные."""
        return list(self._variables.values())
