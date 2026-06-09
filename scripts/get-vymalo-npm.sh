#!/usr/bin/env bash
# Download and extract vymalo package from npm to inspect source
set -euo pipefail
mkdir -p /tmp/vymalo-inspect
cd /tmp/vymalo-inspect
npm pack @vymalo/medusa-keycloak@1.0.10 --silent 2>/dev/null && tar -xzf *.tgz 2>/dev/null && echo "Extracted" || echo "npm pack failed"
ls /tmp/vymalo-inspect/package/ 2>/dev/null | head -10
