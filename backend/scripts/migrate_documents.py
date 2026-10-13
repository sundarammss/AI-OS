"""Retryable migration of local assignment/resource files into Garage.

Run from backend/ with: python -m scripts.migrate_documents
The original local files are intentionally retained after verification.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from pathlib import Path

from sqlalchemy import select

from app.database import async_session, engine
from app.models import AssignmentSubmission, StudyResource
from app.services.object_storage import StorageError, get_storage, stream_reader

logger = logging.getLogger("document_migration")
UPLOAD_ROOT = Path(__file__).resolve().parents[1] / "uploads"


def _object_matches(storage, object_key: str, source: bytes) -> bool:
    try:
        if storage.stat_object(object_key).size != len(source):
            return False
        response = storage.open_stream(object_key)
        remote_hash = hashlib.sha256()
        for chunk in stream_reader(response):
            remote_hash.update(chunk)
        return remote_hash.digest() == hashlib.sha256(source).digest()
    except Exception:
        return False


async def migrate_records(model, category: str, directory: Path, *, skip_youtube: bool = False) -> tuple[int, int]:
    migrated = failed = 0
    storage = get_storage()
    async with async_session() as db:
        rows = (await db.execute(select(model).order_by(model.id))).scalars().all()
        for row in rows:
            if skip_youtube and row.file_type == "youtube":
                continue

            if row.object_key:
                try:
                    exists = await asyncio.to_thread(storage.object_exists, row.object_key)
                    if exists and (
                        row.size_bytes is None
                        or (await asyncio.to_thread(storage.stat_object, row.object_key)).size == row.size_bytes
                    ):
                        migrated += 1
                        continue
                except Exception:
                    logger.exception("Could not verify existing object for %s id=%s", category, row.id)

            current_path = row.file_path
            local_path = directory / current_path
            if not local_path.is_file():
                # Already migrated (or missing); stable object keys make retries
                # harmless, while a missing source is reported and preserved.
                if current_path.startswith((f"migrated/{category}/", "assignments/", "resources/")):
                    try:
                        if await asyncio.to_thread(storage.object_exists, current_path):
                            migrated += 1
                            continue
                    except Exception:
                        logger.exception("Could not verify existing object for %s id=%s", category, row.id)
                logger.error("Legacy file missing for %s id=%s; metadata left unchanged", category, row.id)
                failed += 1
                continue

            try:
                resolved = local_path.resolve()
                resolved.relative_to(directory.resolve())
                suffix = Path(getattr(row, "original_filename", current_path)).suffix.lower()
                if category == "assignment_submissions":
                    suffix = ".pdf"
                object_key = row.object_key or f"migrated/{category}/{row.id}{suffix}"
                content = await asyncio.to_thread(resolved.read_bytes)

                matches = await asyncio.to_thread(_object_matches, storage, object_key, content)
                if not matches:
                    await asyncio.to_thread(
                        storage.upload_file,
                        content,
                        object_key,
                        "application/pdf" if suffix == ".pdf" else "application/octet-stream",
                    )

                if not await asyncio.to_thread(_object_matches, storage, object_key, content):
                    raise RuntimeError("object size or SHA-256 verification failed")
                actual_size = (await asyncio.to_thread(storage.stat_object, object_key)).size

                row.object_key = object_key
                row.size_bytes = actual_size
                if category == "assignment_submissions" and not row.original_filename:
                    row.original_filename = Path(current_path).name
                if not row.content_type:
                    row.content_type = "application/pdf" if suffix == ".pdf" else "application/octet-stream"
                await db.commit()
                migrated += 1
                logger.info("Migrated %s id=%s (%s bytes)", category, row.id, actual_size)
            except Exception:
                await db.rollback()
                failed += 1
                logger.exception("Migration failed for %s id=%s; source retained", category, row.id)

    return migrated, failed


async def main() -> int:
    try:
        submission_result = await migrate_records(
            AssignmentSubmission, "assignment_submissions", UPLOAD_ROOT / "assignments"
        )
        resource_result = await migrate_records(
            StudyResource,
            "study_resources",
            UPLOAD_ROOT / "resources",
            skip_youtube=True,
        )
    except StorageError as exc:
        logger.error("Garage migration is not configured: %s", exc)
        return 2
    finally:
        await engine.dispose()

    migrated = submission_result[0] + resource_result[0]
    failed = submission_result[1] + resource_result[1]
    print(f"Migrated or verified: {migrated}; failed: {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    raise SystemExit(asyncio.run(main()))
