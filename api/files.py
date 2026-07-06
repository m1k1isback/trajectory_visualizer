"""
api/files.py - Эндпоинты для работы с файлами

ЭТОТ ФАЙЛ:
- Принимает файлы от браузера
- Вызывает ядро для парсинга
- Возвращает JSON с данными

ПОТОК ДАННЫХ:
1. Пользователь выбирает файл в браузере
2. JavaScript отправляет POST-запрос на /api/upload
3. FastAPI вызывает функцию upload_file()
4. Функция сохраняет файл во временную папку
5. Вызывает DataLoader.load() - парсит CSV
6. Регистрирует в DatasetManager
7. Считает статистику через Statistics
8. Возвращает JSON браузеру
9. JavaScript обновляет интерфейс
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Form
from pathlib import Path
import tempfile
import os
import math

router = APIRouter()


def sanitize_value(value):
    """
    Заменить NaN/Inf на None для JSON сериализации.
    
    ПРОБЛЕМА:
    Python не может превратить NaN (Not a Number) в JSON
    JSON не поддерживает специальные значения float
    
    РЕШЕНИЕ:
    Заменяем NaN и Inf на None (в JSON станет null)
    Plotly корректно обработает null - просто пропустит точку
    """
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def sanitize_row(row):
    """
    Очистить строку данных от NaN/Inf.
    
    Применяем sanitize_value к каждому элементу строки.
    """
    return [sanitize_value(v) for v in row]


@router.post("/api/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    original_name: str = Form("")  # ← ДОБАВИТЬ ЭТОТ ПАРАМЕТР
):
    """
    Загрузить файл траектории.
    
    original_name - оригинальное имя файла с клиента (опционально)
    """
    
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
        
        # Берём ВСЕ строки для таблицы
        data_sample = [sanitize_row(row) for row in dataset.data.tolist()]
        
        # Определяем имя для отображения: оригинальное или из dataset
        display_name = original_name if original_name else dataset.name
        # Убираем расширение если есть
        if display_name and '.' in display_name:
            display_name = display_name.rsplit('.', 1)[0]
        
        # Формируем JSON-ответ
        response = {
            "dataset_id": dataset_id,
            "name": display_name,  # ← ИСПОЛЬЗУЕМ ОРИГИНАЛЬНОЕ ИМЯ
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
            "statistics": {
                col_name: {
                    "min": col_stat.minimum,
                    "max": col_stat.maximum,
                    "mean": col_stat.mean,
                    "rms": col_stat.rms,
                    "std": col_stat.standard_deviation,
                    "nan_count": col_stat.nan_count,
                    "inf_count": col_stat.inf_count,
                }
                for col_name, col_stat in stats.columns.items()
            },
            "data_sample": data_sample,
        }
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    finally:
        # Удаляем временный файл
        if tmp_path and tmp_path.exists():
            os.unlink(tmp_path)