import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Role, User

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture
def db():
    Base.metadata.create_all(engine)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def users(db):
    roles = {name: Role(name=name) for name in ("ADMIN", "MANAGER", "MEMBER")}
    db.add_all(roles.values())
    db.flush()

    created = {}
    for key, email, role_name in [
        ("admin", "admin@test.com", "ADMIN"),
        ("manager", "manager@test.com", "MANAGER"),
        ("member", "member@test.com", "MEMBER"),
        ("other_member", "other@test.com", "MEMBER"),
    ]:
        user = User(
            email=email,
            full_name=key.replace("_", " ").title(),
            hashed_password=hash_password("Password123!"),
            role_id=roles[role_name].id,
        )
        db.add(user)
        created[key] = user

    db.commit()
    for user in created.values():
        db.refresh(user)
    return created


@pytest.fixture
def login_as(client):
    """Authenticate the test client as the given user."""

    def _login(email: str) -> None:
        res = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Password123!"},
        )
        assert res.status_code == 200, res.text

    return _login