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

# Pre-flight: warn if publishable key is still the placeholder or unset
_key="${NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY:-}"
if [ -z "$_key" ] || [ "$_key" = "pk_test" ]; then
  echo "WARNING: NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is '${_key:-<unset>}'."
  echo "  The storefront will return 500 until the backend seed runs and this"
  echo "  container is restarted (docker compose restart storefront)."
fi
unset _key

echo "Starting Next.js storefront development server..."
pnpm dev
