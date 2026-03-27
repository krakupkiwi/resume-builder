from sqlalchemy import Column, String, Text, DateTime
from app.models.base import Base, new_uuid, utcnow


class AsyncTask(Base):
    __tablename__ = "async_tasks"

    id = Column(String, primary_key=True, default=new_uuid)
    status = Column(String, nullable=False, default="pending")  # pending|started|success|failure
    result_json = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
