#!/usr/bin/env bash
set -euo pipefail

if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  su - postgres -c "/usr/lib/postgresql/*/bin/initdb -D /var/lib/postgresql/data"
  su - postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -o '-c listen_addresses=127.0.0.1' -w start"
  su - postgres -c "psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER ${POSTGRES_USER:-account_book} WITH PASSWORD '${POSTGRES_PASSWORD:-account_book_please_change}';
CREATE DATABASE ${POSTGRES_DB:-account_book} OWNER ${POSTGRES_USER:-account_book};
SQL"
  su - postgres -c "/usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -m fast -w stop"
fi
