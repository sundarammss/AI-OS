# Garage document storage

Assignment submissions and uploaded study resources are stored in the existing
Garage S3 service. MySQL retains the existing metadata and `file_path` column
for legacy file references, and uses `object_key`, `content_type`, and
`size_bytes` for Garage metadata. Existing local files remain readable during
rollout.

Configure these values in the backend `.env` (do not commit secrets):

```dotenv
GARAGE_ENDPOINT=http://127.0.0.1:3900
GARAGE_BUCKET=<existing-provisioned-bucket>
GARAGE_ACCESS_KEY=<Garage S3 key id>
GARAGE_SECRET_KEY=<Garage S3 secret>
GARAGE_REGION=garage
# Optional; defaults to false for the shown HTTP endpoint.
GARAGE_SECURE=false
# Optional. Keep certificate verification enabled when using HTTPS.
GARAGE_VERIFY_TLS=true
```

The application checks that the configured bucket is available and will not
create buckets or keys. When the API runs in another container, use a Garage
hostname reachable from that container instead of `127.0.0.1`.

After provisioning the bucket and configuring credentials, run the repeatable
legacy-file migration from this directory:

```sh
.venv/bin/python -m scripts.migrate_documents
```

The command verifies each object's size and SHA-256 before updating its row,
commits each row independently, and retains the source file. A failed row can
be retried by running the same command again. No binary column or local file
is dropped.
