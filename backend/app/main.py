import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.session import init_db
from app.api.v1.router import v1_router

DIST_DIR = Path("/app/dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title="Resume Builder API",
    version="1.0.0",
    description="Self-hosted resume builder with AI tailoring",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# Serve frontend static assets (JS/CSS/images) and SPA routing.
# Only mounted when the dist directory exists (i.e., inside the container).
if DIST_DIR.exists():
    # Mount the assets subdirectory for hashed static files
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve static files or fall back to index.html for SPA routing."""
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(DIST_DIR / "index.html"))
