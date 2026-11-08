import os
from pathlib import Path

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent


def _url_do_banco() -> str | URL:
    if url := os.getenv("DATABASE_URL", "").strip():
        return url
    if host := os.getenv("DB_HOST", "").strip():
        return URL.create(
            "mysql+pymysql",
            username=os.getenv("DB_USUARIO", "").strip(),
            password=os.getenv("DB_SENHA", ""),
            host=host,
            port=int(os.getenv("DB_PORTA", "").strip() or 3306),
            database=os.getenv("DB_NOME", "").strip(),
            query={"charset": "utf8mb4"},
        )
    return f"sqlite:///{BASE_DIR / 'resolve_ai.db'}"


DATABASE_URL = _url_do_banco()

connect_args = {"check_same_thread": False} if str(DATABASE_URL).startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
