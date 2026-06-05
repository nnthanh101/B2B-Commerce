#!/bin/sh
# start-storefront.sh
# Starts the Next.js storefront dev server on port 8000.
#
# RESTART REQUIREMENT: Next.js inlines NEXT_PUBLIC_* variables at dev-server startup.
# If the backend seed writes a new publishable key into apps/storefront/.env after this
# container started, the storefront MUST be restarted to pick up the new value:
#   docker compose restart storefront
#
# A placeholder value (pk_test) will cause the backend to reject every request with:
#   500 "A valid publishable key is required to proceed with the request"
cd /server/apps/storefront

# Pre-flight: hard-fail if publishable key is placeholder/unset (closes DC-050 regression).
# A placeholder or empty key is ALWAYS wrong at startup — the backend rejects it with 500.
# Fix: run scripts/config-doctor.sh --fix, then docker compose restart storefront.
_key="${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"
if [ -z "$_key" ] || echo "$_key" | grep -qE '^(pk_test|pk_REPLACE)'; then
  echo "ERROR: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is invalid: '${_key:-<unset>}'" >&2
  echo "  Storefront cannot start with a placeholder or empty key." >&2
  echo "  Run: ./scripts/config-doctor.sh --fix" >&2
  echo "  Then: docker compose restart storefront" >&2
  exit 1
fi
echo "Pre-flight OK: publishable key is set (${_key:0:12}...)."
unset _key

echo "Starting Next.js storefront development server..."
pnpm dev
