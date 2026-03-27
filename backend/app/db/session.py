from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import settings
from app.models.base import Base

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # Additive column migrations for existing databases (safe to re-run)
    _run_migrations()


def _run_migrations() -> None:
    """Apply additive schema changes that create_all won't handle for existing tables."""
    migrations = [
        # Added for style customisation feature
        "ALTER TABLE resume_versions ADD COLUMN style_config JSON DEFAULT '{}'",
        # Added for profile skills, certifications, and education
        "ALTER TABLE user_profiles ADD COLUMN skills JSON DEFAULT '[]'",
        "ALTER TABLE user_profiles ADD COLUMN certifications JSON DEFAULT '[]'",
        "ALTER TABLE user_profiles ADD COLUMN education_entries JSON DEFAULT '[]'",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                # Column already exists — ignore
                pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
