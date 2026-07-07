import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
# Ensure all models are registered on Base.metadata before create_all
import app.models
from app.main import app

from app.database import engine as real_engine

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=real_engine
)

@pytest.fixture(scope="function")
def db_session():
    """Create tables and yield database session for each test function."""
    Base.metadata.create_all(bind=real_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=real_engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Expose test client with overridden dependency injection database generator."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
