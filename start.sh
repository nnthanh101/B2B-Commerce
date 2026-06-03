#!/bin/sh
# Backend entrypoint: install workspace deps, run migrations, start Medusa (develop).
# Ref: https://docs.medusajs.com/learn/installation/docker
set -e

cd /server
echo "▶ Installing workspace dependencies…"
pnpm install --frozen-lockfile

cd /server/apps/backend
echo "▶ Running database migrations…"
pnpm medusa db:migrate

echo "▶ Starting Medusa (develop) on :9000 (admin at /app, Vite HMR :5173)…"
exec pnpm dev
