import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Loads backend/.env for local dev; a no-op on Render where env vars are injected.
load_dotenv()


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./local.db"
    # Render hands out postgres://, which SQLAlchemy no longer accepts. We also pin the
    # driver: SQLAlchemy 2.1 defaults postgresql:// to psycopg v3, but we ship psycopg2.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg2://" + url[len(prefix):]
            break
    return url


DATABASE_URL = _database_url()

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
