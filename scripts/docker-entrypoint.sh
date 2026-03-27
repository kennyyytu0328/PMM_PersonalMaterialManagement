#!/bin/sh
set -e

echo "=== PMM Docker Entrypoint ==="

# Ensure the data directory exists (in case the volume wasn't created yet)
mkdir -p /app/data

echo "--- Running database migrations ---"
node /app/scripts/migrate.mjs

echo "--- Seeding sample data (skipped if already seeded) ---"
node /app/scripts/seed.mjs

echo "--- Starting Next.js server ---"
exec node /app/server.js
