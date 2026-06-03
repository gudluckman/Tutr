#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SEED_FILE="$ROOT_DIR/backend/scripts/seed-local-data.sql"
CONTAINER_NAME="tutr-postgres"
DB_NAME="${LOCAL_DATABASE_NAME:-tutr}"
DB_USER="${LOCAL_DATABASE_USERNAME:-tutr_user}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required to seed the local database." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Local Postgres container '$CONTAINER_NAME' is not running." >&2
  echo "Start it first with: docker compose up -d" >&2
  exit 1
fi

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$SEED_FILE"
echo "Seeded local Tutr database with repeatable sample data."
