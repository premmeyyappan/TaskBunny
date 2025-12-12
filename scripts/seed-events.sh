#!/usr/bin/env bash
# seed-events.sh — Seed the database with benchmark data via the SQL seed file.
# Run this after docker-compose up to populate test data.
#
# Usage: bash scripts/seed-events.sh

set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-taskbunny-postgres-1}"

echo "Seeding benchmark data into PostgreSQL…"
docker exec -i "$CONTAINER" psql -U taskbunny -d taskbunny \
  < packages/server/src/db/seeds/benchmark_seed.sql

echo "Seed complete. Run scripts/explain-queries.sh to capture baseline query plans."
