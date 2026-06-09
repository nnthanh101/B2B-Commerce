#!/usr/bin/env bash
# Tail backend logs for SSO-related entries
docker logs ec_backend --tail 50 2>&1 | grep -i "auth\|keycloak\|callback\|vymalo\|error\|warn" | tail -30 || docker logs ec_backend --tail 30 2>&1
