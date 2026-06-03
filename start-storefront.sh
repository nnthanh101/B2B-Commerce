#!/bin/sh
# Storefront entrypoint: install workspace deps, start the Next.js dev server.
# The storefront requires NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY at startup — create it
# in the Admin (Settings → API Key Management) and set it in apps/storefront/.env.
set -e

cd /server
echo "▶ Installing workspace dependencies…"
pnpm install --frozen-lockfile

cd /server/apps/storefront
echo "▶ Starting Next.js storefront on :8000…"
exec pnpm dev
