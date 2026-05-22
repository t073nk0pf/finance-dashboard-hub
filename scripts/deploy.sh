#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
RUN_SEED="${RUN_SEED:-false}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Create it from .env.production.example before deploy."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-${APP_BASE_URL:-http://127.0.0.1:3000}}"

echo "Pulling latest code..."
git pull --ff-only

echo "Building and starting containers..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Applying Prisma schema..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app npx prisma db push

if [ "$RUN_SEED" = "true" ]; then
  echo "Running seed because RUN_SEED=true..."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app npm run prisma:seed
else
  echo "Skipping seed. Set RUN_SEED=true to run it explicitly."
fi

echo "Running smoke test against $BASE_URL..."
BASE_URL="$BASE_URL" npm run smoke

echo "Container status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
