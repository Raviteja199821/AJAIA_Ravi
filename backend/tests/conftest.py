import os

# SAFETY: must run before anything from `app` is imported. backend/.env holds the real
# Render DATABASE_URL; load_dotenv() (override=False) will not replace this value.
os.environ["DATABASE_URL"] = "sqlite://"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import db as app_db  # noqa: E402
from app import main  # noqa: E402

assert app_db.DATABASE_URL.startswith("sqlite"), (
    f"Refusing to run tests against a non-SQLite database: {app_db.engine.dialect.name}"
)


@pytest.fixture
def client(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestSession = sessionmaker(bind=engine, autoflush=False)

    # The lifespan creates tables and seeds through these module globals.
    monkeypatch.setattr(main, "engine", engine)
    monkeypatch.setattr(main, "SessionLocal", TestSession)

    def _get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[app_db.get_db] = _get_db
    try:
        with TestClient(main.app) as c:
            yield c
    finally:
        main.app.dependency_overrides.clear()
        engine.dispose()


def login(client, username: str) -> dict[str, str]:
    res = client.post("/auth/login", json={"username": username, "password": "demo123"})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}
