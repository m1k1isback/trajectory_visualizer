from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

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

from api.files import router as files_router
from api.plots import router as plots_router

BASE_DIR = Path(__file__).parent

app = FastAPI(title="Визуализатор траекторий")

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

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

app.include_router(files_router)
app.include_router(plots_router)

@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "templates" / "index.html")