from celery import Celery
from app.config import settings

celery_app = Celery(
    "resume_builder",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks.ai_tasks",
        "app.workers.tasks.document_tasks",
        "app.workers.tasks.search_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    result_expires=3600,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
