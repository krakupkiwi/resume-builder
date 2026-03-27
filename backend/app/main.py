import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db.session import init_db
from app.api.v1.router import v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    init_db()
    yield
    # Shutdown — nothing to clean up


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
