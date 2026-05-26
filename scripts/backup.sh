#!/usr/bin/env bash
set -euo pipefail
TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p /backups
su - postgres -c "pg_dump -U ${POSTGRES_USER:-account_book} ${POSTGRES_DB:-account_book}" > "/backups/db_${TS}.sql" || true
tar -czf "/backups/uploads_${TS}.tar.gz" -C /app uploads || true
echo "backup done: $TS"
