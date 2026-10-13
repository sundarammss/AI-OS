"""Object storage abstraction backed by Garage (S3-compatible) via the MinIO SDK.

Responsibilities:
- upload/download/delete/stat objects in the Garage bucket
- generate collision-resistant object keys (never trust raw client filenames)
- map S3 errors to storage-level exceptions so routers/tasks stay storage-agnostic

Configuration comes exclusively from environment variables (see ``.env``):
    GARAGE_ENDPOINT       e.g. http://localhost:3900 (scheme optional)
    GARAGE_BUCKET         required existing Garage bucket
    GARAGE_ACCESS_KEY     Garage access key id
    GARAGE_SECRET_KEY     Garage secret key
    GARAGE_REGION         default: garage
    GARAGE_SECURE         default: derived from endpoint scheme (false for http)
    GARAGE_VERIFY_TLS     default: true
    GARAGE_TIMEOUT_SECONDS  default: 60 (read timeout)
"""

from __future__ import annotations

import io
import logging
import os
import re
import threading
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, BinaryIO
from urllib.parse import quote

from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error
from urllib3 import PoolManager
from urllib3.util.timeout import Timeout

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_REGION = "garage"
DEFAULT_TIMEOUT_SECONDS = 60.0
DEFAULT_CONNECT_TIMEOUT_SECONDS = 5.0
_STREAM_CHUNK_SIZE = 64 * 1024
_SAFE_EXT = re.compile(r"^[A-Za-z0-9]{1,10}$")


class StorageError(Exception):
    """Base class for object-storage failures."""


class ObjectNotFoundError(StorageError):
    """The requested object does not exist in the bucket."""


@dataclass(frozen=True)
class ObjectStat:
    size: int
    content_type: str | None
    etag: str | None


def _parse_endpoint(raw: str) -> tuple[str, bool]:
    """Return (host[:port], secure) for a MinIO endpoint string."""
    raw = (raw or "").strip().rstrip("/")
    secure = True
    if raw.lower().startswith("https://"):
        raw = raw[len("https://"):]
    elif raw.lower().startswith("http://"):
        raw = raw[len("http://"):]
        secure = False
    return raw, secure


def generate_object_key(prefix: str, original_filename: str | None = None, suffix: str | None = None) -> str:
    """Build a collision-resistant object key under ``prefix``.

    The original filename is never used verbatim; only its final extension is
    reused (sanitised). Callers should persist the original filename separately.
    """
    prefix = (prefix or "documents").strip("/")
    ext = ""
    if suffix:
        ext = suffix if suffix.startswith(".") else f".{suffix}"
    elif original_filename:
        candidate = Path(original_filename).suffix.lstrip(".").lower()
        if _SAFE_EXT.match(candidate):
            ext = f".{candidate}"
    return f"{prefix}/{uuid.uuid4().hex}{ext}"


def content_disposition(filename: str) -> str:
    """Build a Content-Disposition header value preserving the original name."""
    safe = "".join(ch for ch in (filename or "download") if ch not in "\r\n\\\"")
    try:
        safe.encode("ascii")
        return f'attachment; filename="{safe}"'
    except UnicodeEncodeError:
        return f"attachment; filename*=UTF-8''{quote(safe)}"


def stream_reader(response: Any, chunk_size: int = _STREAM_CHUNK_SIZE):
    """Yield an object body in chunks, always closing the underlying response."""
    try:
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            yield chunk
    finally:
        try:
            response.close()
        except Exception:  # pragma: no cover - defensive
            pass
        try:
            response.release_conn()
        except Exception:  # pragma: no cover - defensive
            pass


def _to_storage_error(exc: S3Error) -> StorageError:
    if exc.code in ("NoSuchKey", "NoSuchObject", "NoSuchObjectVersion"):
        return ObjectNotFoundError(str(exc))
    return StorageError(str(exc))


class ObjectStorage:
    """Thin, thread-safe wrapper around the MinIO SDK pointed at Garage."""

    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = DEFAULT_REGION,
        secure: bool = False,
        verify_tls: bool = True,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._bucket = bucket
        self._region = region
        http_client = PoolManager(
            timeout=Timeout(
                connect=min(DEFAULT_CONNECT_TIMEOUT_SECONDS, timeout_seconds),
                read=timeout_seconds,
            )
        )
        self._client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
            region=region,
            cert_check=verify_tls,
            http_client=http_client,
        )

    # ── helpers ────────────────────────────────────────────────────────

    def _require(self, data: bytes | BinaryIO, length: int | None) -> tuple[BinaryIO, int]:
        if isinstance(data, (bytes, bytearray)):
            payload = bytes(data)
            return io.BytesIO(payload), len(payload)
        if length is None:
            raise StorageError("length is required when uploading from a stream")
        return data, length

    # ── operations ─────────────────────────────────────────────────────

    def upload_file(
        self,
        data: bytes | BinaryIO,
        object_key: str,
        content_type: str | None = None,
        length: int | None = None,
    ) -> str:
        stream, size = self._require(data, length)
        try:
            self._client.put_object(
                self._bucket,
                object_key,
                stream,
                length=size,
                content_type=content_type,
            )
        except S3Error as exc:
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc
        return object_key

    def open_stream(self, object_key: str) -> Any:
        """Return a readable streaming response; caller must consume/close it."""
        try:
            return self._client.get_object(self._bucket, object_key)
        except S3Error as exc:
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc

    def download_file(self, object_key: str) -> bytes:
        response = self.open_stream(object_key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()

    def delete_file(self, object_key: str) -> None:
        """Delete an object; deleting a missing object is a no-op."""
        try:
            self._client.remove_object(self._bucket, object_key)
        except S3Error as exc:
            if exc.code in ("NoSuchKey", "NoSuchObject"):
                return
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc

    def stat_object(self, object_key: str) -> ObjectStat:
        try:
            info = self._client.stat_object(self._bucket, object_key)
        except S3Error as exc:
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc
        etag = (info.etag or "").strip('"') or None
        return ObjectStat(size=info.size, content_type=info.content_type, etag=etag)

    def object_exists(self, object_key: str) -> bool:
        try:
            self.stat_object(object_key)
            return True
        except ObjectNotFoundError:
            return False

    def verify_bucket(self) -> None:
        """Confirm the configured bucket exists; never create it implicitly."""
        try:
            if not self._client.bucket_exists(self._bucket):
                raise StorageError(f"configured Garage bucket {self._bucket!r} does not exist")
        except S3Error as exc:
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc

    def ensure_bucket(self) -> None:
        """Create the configured bucket if it does not exist (best effort)."""
        try:
            if not self._client.bucket_exists(self._bucket):
                self._client.make_bucket(self._bucket, self._region)
        except S3Error as exc:
            raise _to_storage_error(exc) from exc
        except OSError as exc:
            raise StorageError(f"object storage unreachable: {exc}") from exc


# ── singleton access ───────────────────────────────────────────────────

_storage_lock = threading.Lock()
_storage: ObjectStorage | None = None


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def build_storage_from_env() -> ObjectStorage:
    endpoint = os.getenv("GARAGE_ENDPOINT", "http://localhost:3900")
    bucket = os.getenv("GARAGE_BUCKET", "").strip()
    host, scheme_secure = _parse_endpoint(endpoint)
    access_key = os.getenv("GARAGE_ACCESS_KEY", "")
    secret_key = os.getenv("GARAGE_SECRET_KEY", "")
    if not bucket or not access_key or not secret_key:
        raise StorageError(
            "GARAGE_BUCKET, GARAGE_ACCESS_KEY, and GARAGE_SECRET_KEY must be set to use object storage"
        )
    try:
        timeout = float(os.getenv("GARAGE_TIMEOUT_SECONDS", str(DEFAULT_TIMEOUT_SECONDS)))
    except ValueError:
        timeout = DEFAULT_TIMEOUT_SECONDS
    return ObjectStorage(
        endpoint=host,
        access_key=access_key,
        secret_key=secret_key,
        bucket=bucket,
        region=os.getenv("GARAGE_REGION", DEFAULT_REGION),
        secure=_env_bool("GARAGE_SECURE", scheme_secure),
        verify_tls=_env_bool("GARAGE_VERIFY_TLS", True),
        timeout_seconds=timeout,
    )


def get_storage() -> ObjectStorage:
    """Return the process-wide ObjectStorage instance (lazily constructed)."""
    global _storage
    if _storage is None:
        with _storage_lock:
            if _storage is None:
                storage = build_storage_from_env()
                storage.verify_bucket()
                _storage = storage
    return _storage


def set_storage(storage: ObjectStorage | None) -> None:
    """Replace/clear the singleton (used by tests)."""
    global _storage
    with _storage_lock:
        _storage = storage
