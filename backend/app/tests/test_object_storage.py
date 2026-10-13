from __future__ import annotations

import io
import unittest

from app.services.object_storage import ObjectNotFoundError, ObjectStorage, generate_object_key


class _FakeS3:
    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def put_object(self, bucket, key, stream, length, content_type):
        self.objects[key] = stream.read(length)

    def get_object(self, bucket, key):
        if key not in self.objects:
            raise ObjectNotFoundError(key)
        return _FakeResponse(self.objects[key])

    def remove_object(self, bucket, key):
        self.objects.pop(key, None)

    def stat_object(self, bucket, key):
        if key not in self.objects:
            raise ObjectNotFoundError(key)
        return type("Stat", (), {"size": len(self.objects[key]), "etag": None, "content_type": None})()


class _FakeResponse(io.BytesIO):
    def release_conn(self):
        pass


class ObjectStorageTests(unittest.TestCase):
    def setUp(self):
        self.client = _FakeS3()
        self.storage = ObjectStorage.__new__(ObjectStorage)
        self.storage._bucket = "documents"
        self.storage._client = self.client

    def test_upload_download_size_and_delete(self):
        key = self.storage.upload_file(b"pdf-bytes", "resources/a.pdf", "application/pdf")
        self.assertEqual(key, "resources/a.pdf")
        self.assertEqual(self.client.objects[key], b"pdf-bytes")
        self.assertTrue(self.storage.object_exists(key))
        self.assertEqual(self.storage.stat_object(key).size, 9)
        self.assertEqual(self.storage.download_file(key), b"pdf-bytes")
        self.storage.delete_file(key)
        self.assertFalse(self.storage.object_exists(key))

    def test_missing_object_is_reported(self):
        self.storage.stat_object = lambda _key: (_ for _ in ()).throw(ObjectNotFoundError())
        self.assertFalse(self.storage.object_exists("missing.pdf"))
        self.storage.open_stream = lambda _key: (_ for _ in ()).throw(ObjectNotFoundError())
        with self.assertRaises(ObjectNotFoundError):
            self.storage.download_file("missing.pdf")

    def test_same_original_filename_gets_distinct_safe_keys(self):
        first = generate_object_key("resources", "../../lecture notes.pdf")
        second = generate_object_key("resources", "../../lecture notes.pdf")
        self.assertNotEqual(first, second)
        self.assertTrue(first.startswith("resources/"))
        self.assertNotIn("lecture notes", first)


if __name__ == "__main__":
    unittest.main()
