# api/files.py — Эндпоинты для работы с файлами

from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pathlib import Path
import tempfile
import os
import numpy as np

router = APIRouter()

@router.post("/api/upload")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """
    Загрузить файл траектории.
    Возвращает: dataset_id, имена столбцов, количество строк, статистику,
    единицы измерения и первые 50 строк данных для таблицы.
    """
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
        
        # Берём первые 50 строк для превью таблицы
        max_rows = min(50, dataset.row_count)
        data_sample = dataset.data[:max_rows].tolist()
        
        # Формируем ответ
        response = {
            "dataset_id": dataset_id,
            "name": dataset.name,
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
        if tmp_path and tmp_path.exists():
            os.unlink(tmp_path)