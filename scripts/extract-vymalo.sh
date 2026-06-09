#!/usr/bin/env bash
# Extract vymalo JS files from pnpm store in container
# Copy the pnpm package cache to a differently named directory
cp -r /tmp/pnpm-store /tmp/pkg-cache 2>/dev/null || echo "copy failed"
ls /tmp/pkg-cache/ 2>/dev/null | head -10 || echo "empty"
