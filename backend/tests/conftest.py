"""
Shared pytest fixtures for PS105 backend test suite.

conftest.py is auto-discovered by pytest and applies to all tests in the
same directory and sub-directories.

Key fixture:
  shared_db_session  –  module-scoped in-memory SQLite database populated
                        with seed data once per test module.  Individual
                        test modules that need a FastAPI TestClient derive
                        their client from this fixture so the expensive
                        seed+password-hashing step runs only once per
                        collection session.

Environment:
  BCRYPT_ROUNDS=4 is set here to keep bcrypt fast during testing.
  Production code reads this variable via auth_service.get_password_hash().
"""

import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ---------------------------------------------------------------------------
# Speed-up: low bcrypt work factor for tests only
# Must be set before any app module is imported.
# ---------------------------------------------------------------------------
os.environ.setdefault("BCRYPT_ROUNDS", "4")

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


@pytest.fixture(scope="module")
def seeded_db_session():
    """
    Module-scoped fixture: creates an in-memory SQLite database, runs
    run_seed() exactly once, and yields the session.

    Using scope="module" means the entire seed (which includes bcrypt
    password hashing, risk quantification, and optimization) only runs
    once per test file rather than once per test function.
    """
    from app.main import app
    from app.database.connection import Base, get_db
    from app.database.seed import run_seed

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    # Seed once for the entire module
    run_seed(session)

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    yield session, app

    app.dependency_overrides.clear()
    session.close()

