from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import traceback

router = APIRouter()


class TrajectoryRequest(BaseModel):
    dataset_id: str


@router.post("/api/cesium/trajectory")
async def get_trajectory(request: TrajectoryRequest):
    """Получить траекторию для отображения в Cesium с полными данными."""
    try:
        from main import app
        dataset_manager = app.state.dataset_manager
        cesium_manager = app.state.cesium_manager

        print(f"[CesiumAPI] Запрос траектории для: {request.dataset_id}")

        dataset = dataset_manager.get(request.dataset_id)
        if not dataset:
            print(f"[CesiumAPI] Dataset не найден: {request.dataset_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Dataset {request.dataset_id} not found"
            )

        print(f"[CesiumAPI] Dataset найден: {dataset.name}")
        print(f"[CesiumAPI] Колонок: {dataset.column_count}, строк: {dataset.row_count}")
        print(f"[CesiumAPI] Имена колонок: {dataset.column_names}")

        # Извлекаем траекторию (только координаты для polyline)
        trajectory = cesium_manager.extract_trajectory(dataset)

        # === НОВОЕ: Извлекаем полные данные для tooltip ===
        # Находим индексы колонок
        col_names = dataset.column_names
        x_idx = -1
        y_idx = -1
        z_idx = -1
        vx_idx = -1
        vy_idx = -1
        vz_idx = -1
        t_idx = -1
        
        for i, name in enumerate(col_names):
            name_lower = name.lower()
            if name_lower in ['x', 'lon', 'longitude']:
                x_idx = i
            elif name_lower in ['y', 'lat', 'latitude']:
                y_idx = i
            elif name_lower in ['z', 'alt', 'altitude', 'h']:
                z_idx = i
            elif name_lower in ['vx', 'v_x']:
                vx_idx = i
            elif name_lower in ['vy', 'v_y']:
                vy_idx = i
            elif name_lower in ['vz', 'v_z']:
                vz_idx = i
            elif name_lower in ['t', 'time']:
                t_idx = i

        print(f"[CesiumAPI] Индексы колонок: x={x_idx}, y={y_idx}, z={z_idx}, vx={vx_idx}, vy={vy_idx}, vz={vz_idx}")

        # Создаем полные данные точек
        points_data = []
        for row_idx, row in enumerate(dataset.data):
            point = {
                'x': float(row[x_idx]) if x_idx >= 0 else 0,
                'y': float(row[y_idx]) if y_idx >= 0 else 0,
                'z': float(row[z_idx]) if z_idx >= 0 else 0,
            }
            
            # Добавляем скорости если есть
            if vx_idx >= 0:
                point['vx'] = float(row[vx_idx])
            if vy_idx >= 0:
                point['vy'] = float(row[vy_idx])
            if vz_idx >= 0:
                point['vz'] = float(row[vz_idx])
            if t_idx >= 0:
                point['t'] = float(row[t_idx])
            
            points_data.append(point)

        print(f"[CesiumAPI] Траектория: {len(trajectory)} точек, полных данных: {len(points_data)}")

        return {
            "trajectory": trajectory,
            "points_data": points_data,  # ← НОВОЕ: полные данные
            "points": len(trajectory)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CesiumAPI] ОШИБКА: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))