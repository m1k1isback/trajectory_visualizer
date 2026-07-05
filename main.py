# main.py — точка входа приложения

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# --- Импорт ядра ---
from core.logger import Logger
from core.data_loader import DataLoader
from core.dataset_manager import DatasetManager
from core.variable_manager import VariableManager
from core.validators import DatasetValidator
from core.statistics import Statistics
from core.graph_manager import GraphManager
from core.table_manager import TableManager
from core.cesium_manager import CesiumManager
from core.animation_manager import AnimationManager

# --- Импорт API роутеров ---
from api.files import router as files_router

# --- Путь к корню проекта ---
BASE_DIR = Path(__file__).parent

# --- Создаём приложение ---
app = FastAPI(title="Визуализатор траекторий")

# --- Создаём объекты ядра ---
# Они живут всё время работы сервера и хранят данные в памяти
logger = Logger()
data_loader = DataLoader(logger=logger)
dataset_manager = DatasetManager()
variable_manager = VariableManager()
validator = DatasetValidator()
statistics_calc = Statistics()
graph_manager = GraphManager()
table_manager = TableManager()
cesium_manager = CesiumManager()
animation_manager = AnimationManager()

# --- Сохраняем в app.state ---
# Это нужно чтобы роутеры (api/files.py и др.) могли получить доступ к ядру
app.state.logger = logger
app.state.data_loader = data_loader
app.state.dataset_manager = dataset_manager
app.state.variable_manager = variable_manager
app.state.validator = validator
app.state.statistics = statistics_calc
app.state.graph_manager = graph_manager
app.state.table_manager = table_manager
app.state.cesium_manager = cesium_manager
app.state.animation_manager = animation_manager

# --- Раздаём статические файлы (CSS, JS, картинки) ---
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# --- Подключаем роутеры ---
app.include_router(files_router)

# --- Главная страница ---
@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "templates" / "index.html")