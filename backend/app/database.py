from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "aios")

DATABASE_URL = (
    f"mysql+aiomysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
SYNC_DATABASE_URL = DATABASE_URL.replace("+aiomysql", "+pymysql")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False)
sync_session = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_object_storage_columns()


# Additive, idempotent column backfill for tables that already exist in
# MySQL (create_all does not ALTER existing tables). Only ADD COLUMN is
# performed — nothing is dropped or modified destructively.
_OBJECT_STORAGE_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "assignment_submissions": [
        ("object_key", "VARCHAR(500) NULL"),
        ("original_filename", "VARCHAR(255) NULL"),
        ("content_type", "VARCHAR(120) NULL"),
        ("size_bytes", "INT NULL"),
    ],
    "study_resources": [
        ("object_key", "VARCHAR(500) NULL"),
        ("content_type", "VARCHAR(120) NULL"),
        ("size_bytes", "INT NULL"),
    ],
}


async def _ensure_object_storage_columns() -> None:
    from sqlalchemy import text

    async with engine.begin() as conn:
        for table, columns in _OBJECT_STORAGE_COLUMNS.items():
            for name, ddl_type in columns:
                exists = (
                    await conn.execute(
                        text(
                            "SELECT COUNT(*) FROM information_schema.columns "
                            "WHERE table_schema = DATABASE() "
                            "AND table_name = :tbl AND column_name = :col"
                        ),
                        {"tbl": table, "col": name},
                    )
                ).scalar()
                if not exists:
                    await conn.execute(
                        text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}")
                    )
