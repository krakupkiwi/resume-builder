"""
Lightweight async task manager using SQLite as the result backend.
Replaces Celery + Redis for single-container deployments.
"""
import asyncio
import json

from app.db.session import SessionLocal
from app.models.async_task import AsyncTask


def create_task(task_id: str) -> None:
    """Persist a new task record with status=pending."""
    db = SessionLocal()
    try:
        db.add(AsyncTask(id=task_id))
        db.commit()
    finally:
        db.close()


def get_task(task_id: str) -> dict | None:
    """Return task status/result dict, or None if not found."""
    db = SessionLocal()
    try:
        task = db.query(AsyncTask).filter(AsyncTask.id == task_id).first()
        if not task:
            return None
        result = json.loads(task.result_json) if task.result_json else None
        return {"task_id": task.id, "status": task.status, "result": result, "error": task.error}
    finally:
        db.close()


def _update(task_id: str, **fields) -> None:
    db = SessionLocal()
    try:
        db.query(AsyncTask).filter(AsyncTask.id == task_id).update(fields)
        db.commit()
    finally:
        db.close()


async def run_task(task_id: str, fn, *args, **kwargs) -> None:
    """
    Run a blocking function in a thread pool, tracking status in SQLite.
    Usage:
        asyncio.create_task(run_task(task_id, my_sync_fn, arg1, arg2))
    """
    _update(task_id, status="started")
    try:
        result = await asyncio.to_thread(fn, *args, **kwargs)
        _update(task_id, status="success", result_json=json.dumps(result))
    except Exception as exc:
        _update(task_id, status="failure", error=str(exc))
