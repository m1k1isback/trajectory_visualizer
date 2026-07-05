from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(title="Визуализатор траекторий")

# Путь к корню проекта
BASE_DIR = Path(__file__).parent

# Раздаём статические файлы (CSS, JS, картинки)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Главная страница — просто отдаём index.html
@app.get("/")
async def index():
    return FileResponse(BASE_DIR / "templates" / "index.html")