#!/usr/bin/env bash
# Search for vymalo in common pnpm store locations inside container
docker cp ec_backend:/root/.local/share/pnpm/store /tmp/pnpm-store 2>/dev/null && echo "pnpm store found" || echo "no pnpm store at /root/.local"
docker cp ec_backend:/home/node/.local/share/pnpm/store /tmp/pnpm-store2 2>/dev/null && echo "home/node pnpm store found" || echo "no pnpm store at home/node"
