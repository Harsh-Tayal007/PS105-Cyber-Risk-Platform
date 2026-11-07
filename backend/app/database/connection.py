from typing import Generator
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import settings

# Configure engine based on SQLite vs PostgreSQL
db_url = settings.DATABASE_URL
engine_kwargs = {}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if db_url == "sqlite:///./ps105.db":
        backend_db = Path(__file__).resolve().parent.parent.parent / "backend" / "ps105.db"
        root_db = Path(__file__).resolve().parent.parent.parent / "ps105.db"
        if backend_db.exists():
            db_url = f"sqlite:///{backend_db.as_posix()}"
        elif root_db.exists():
            db_url = f"sqlite:///{root_db.as_posix()}"

engine = create_engine(db_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Verifies active connectivity to the configured database engine."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def init_db() -> None:
    """Initializes all database tables registered under Base declarative metadata."""
    # Import domain models to register tables with Base.metadata
    import app.models.domain  # noqa: F401
    Base.metadata.create_all(bind=engine)
