#!/usr/bin/env bash
set -euo pipefail
cp -n .env.example .env || true
mkdir -p data/{postgres,redis,uploads,logs,backups} deploy/nginx/cert

docker compose up -d --build

echo "Install complete."
