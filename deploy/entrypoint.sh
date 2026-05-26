#!/usr/bin/env bash
set -euo pipefail

cp /deploy/nginx/default.conf /etc/nginx/sites-enabled/default
cp /deploy/cron/account-book-cron /etc/cron.d/account-book-cron
chmod 0644 /etc/cron.d/account-book-cron

mkdir -p /var/lib/postgresql/data /var/lib/redis /backups /var/log/account-book /app/uploads
chown -R postgres:postgres /var/lib/postgresql
chown -R redis:redis /var/lib/redis

/deploy/postgres/init-db.sh

exec /usr/bin/supervisord -c /deploy/supervisor/supervisord.conf
