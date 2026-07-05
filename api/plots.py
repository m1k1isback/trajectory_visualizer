# api/plots.py — Эндпоинты для работы с графиками

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import math

router = APIRouter()


class PlotRequest(BaseModel):
    dataset_id: str
    x_variable: str | None = None
    y_variables: list[str]


def sanitize_value(value):
    """Заменить NaN/Inf на None для корректной JSON сериализации."""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def sanitize_list(values):
    """Очистить список значений от NaN/Inf."""
    return [sanitize_value(v) for v in values]


@router.post("/api/plots/create")
async def create_plot(request: Request, plot_req: PlotRequest):
    """
    Создать данные для 2D графика.
    Возвращает X-массив и массивы Y для каждой переменной.
    """
    dataset_manager = request.app.state.dataset_manager
    
    # Получаем dataset
    try:
        dataset = dataset_manager.get(plot_req.dataset_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Dataset не найден")
    
    # Определяем X
    if plot_req.x_variable:
        x_name = plot_req.x_variable
        try:
            x_values = sanitize_list(dataset.get_column(x_name).tolist())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Переменная '{x_name}' не найдена")
    else:
        x_name = dataset.argument_name
        x_values = sanitize_list(dataset.argument_values.tolist())
    
    # Собираем Y-кривые
    curves = []
    for y_var in plot_req.y_variables:
        try:
            y_values = sanitize_list(dataset.get_column(y_var).tolist())
            unit = dataset.units.get(y_var)
            curves.append({
                "name": y_var,
                "y": y_values,
                "unit": unit,
            })
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Переменная '{y_var}' не найдена")
    
    return {
        "x_name": x_name,
        "x_unit": dataset.units.get(x_name),
        "x": x_values,
        "curves": curves,
        "title": ", ".join(plot_req.y_variables) + " от " + x_name,
    }