"""
api/files.py - Эндпоинты для работы с файлами
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form
from pathlib import Path
import tempfile
import os
import math

router = APIRouter()


def sanitize_value(value):
    """Заменить NaN/Inf на None для JSON сериализации."""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def sanitize_row(row):
    """Очистить строку данных от NaN/Inf."""
    return [sanitize_value(v) for v in row]


@router.post("/api/files/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    original_name: str = Form("")
):
    """Загрузить файл траектории."""
    
    # Получаем объекты ядра из app.state
    data_loader = request.app.state.data_loader
    dataset_manager = request.app.state.dataset_manager
    variable_manager = request.app.state.variable_manager
    validator = request.app.state.validator
    statistics_calc = request.app.state.statistics
    
    tmp_path = None
    
    try:
        # Сохраняем файл во временную папку
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = Path(tmp.name)
        
        # Загружаем через ядро
        dataset = data_loader.load(tmp_path)
        
        # Регистрируем в менеджере
        dataset_id = dataset_manager.register(dataset)
        
        # Регистрируем переменные
        variable_manager.register_dataset(dataset)
        
        # Проверяем данные
        validation = validator.validate(dataset)
        
        # Считаем статистику
        stats = statistics_calc.calculate(dataset)
        
        # Берём ВСЕ строки для таблицы (теперь ключ 'data' для фронтенда)
        data_rows = [sanitize_row(row) for row in dataset.data.tolist()]
        
        # Берем ошибки парсинга из метаданных dataset (если есть)
        invalid_values = dataset.metadata.get("invalid_values", [])
        malformed_rows = dataset.metadata.get("malformed_rows", [])
        
        # Определяем имя для отображения
        display_name = original_name if original_name else dataset.name
        if display_name and '.' in display_name:
            display_name = display_name.rsplit('.', 1)[0]
        
        # Преобразуем статистику из словаря в список (как ждет фронтенд)
        stats_list = []
        for col_name, col_stat in stats.columns.items():
            stats_list.append({
                "name": col_name,
                "min": col_stat.minimum,
                "max": col_stat.maximum,
                "mean": col_stat.mean,
                "rms": col_stat.rms,
                "std": col_stat.standard_deviation,
                "nan_count": col_stat.nan_count,
                "inf_count": col_stat.inf_count,
            })
        
        # Формируем JSON-ответ, полностью совместимый с FileLoader.js
        response = {
            "dataset_id": dataset_id,
            "name": display_name,
            "argument_name": dataset.argument_name,
            "variable_names": dataset.variable_names,
            "column_names": dataset.column_names,
            "units": dataset.units,
            "row_count": stats.row_count,
            "column_count": stats.column_count,
            "is_valid": validation.is_valid,
            "validation_messages": [
                {
                    "severity": msg.severity,
                    "code": msg.code,
                    "message": msg.message,
                }
                for msg in validation.messages
            ],
            "invalid_values": invalid_values,
            "malformed_rows": malformed_rows,
            "data": data_rows,  # <-- ИСПРАВЛЕНО: было data_sample
            "statistics": stats_list,  # <-- ИСПРАВЛЕНО: теперь это список объектов
        }
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    finally:
        # Удаляем временный файл
        if tmp_path and tmp_path.exists():
            os.unlink(tmp_path)