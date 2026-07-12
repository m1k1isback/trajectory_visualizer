from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import traceback

router = APIRouter()


class TrajectoryRequest(BaseModel):
    dataset_id: str


@router.post("/api/cesium/trajectory")
async def get_trajectory(request: TrajectoryRequest):
    """Получить траекторию для отображения в Cesium."""
    try:
        from main import app
        dataset_manager = app.state.dataset_manager
        cesium_manager = app.state.cesium_manager

        print(f"[CesiumAPI] Запрос траектории для: {request.dataset_id}")

        # Получаем набор данных
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

        # Извлекаем траекторию
        trajectory = cesium_manager.extract_trajectory(dataset)

        print(f"[CesiumAPI] Траектория: {len(trajectory)} точек")

        return {
            "trajectory": trajectory,
            "points": len(trajectory)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[CesiumAPI] ОШИБКА: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))