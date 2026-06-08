---
title: Keycloak SSO Integration
description: Local-first Keycloak identity provider for B2B-Commerce storefront and backend authentication. How to run it, configure SSO login, and understand the admin dashboard limitation.
sidebar_position: 1
tags: [authentication, sso, keycloak, oidc, local-dev, security]
source_refs:
  - path: "docker-compose.yml"
    last_compiled: "2026-06-08"
  - path: "apps/backend/.env.template"
    last_compiled: "2026-06-08"
last_compiled: "2026-06-09T00:00:00Z"
---

# Keycloak SSO Integration

B2B-Commerce integrates with Keycloak 26.2 for OpenID Connect (OIDC) authentication. The Medusa backend registers Keycloak as a confidential OIDC provider alongside the built-in email/password auth. The storefront includes a "Sign in with SSO" button; users authenticate via Keycloak and return to a logged-in session.

## What Ships

- **Keycloak 26.2** — Local Docker service (`ec_keycloak`, host port 8080)
- **Pre-configured Realm** — `medusa-commerce` realm with demo users and a confidential client (`medusa`)
- **OIDC Provider** — Medusa backend registers `@vymalo/medusa-keycloak@1.0.10` as an auth provider for both **users** (admin) and **customers** (storefront)
- **Storefront SSO** — "Sign in with SSO" button on the login page; full auth-code OIDC flow
- **Observability** — Prometheus scrapes Keycloak metrics; Grafana includes a health panel

## Prerequisites

Before starting the stack with Keycloak, complete these **two manual setup steps** (one-time only):

### Step 1: Add Keycloak to /etc/hosts

The OIDC issuer URL must be the same for both the browser (JavaScript redirect) and the backend container. Add a DNS entry for `keycloak`:

```bash
sudo sh -c 'echo "127.0.0.1 keycloak" >> /etc/hosts'
```

**Why**: Without this, the browser sees `http://localhost:8080` but the backend container sees `http://keycloak:8080`. The OIDC `iss` (issuer) claim will not match, and token validation fails.

**Verify**:
```bash
ping keycloak
# Expected: PING keycloak (127.0.0.1) ...
```

### Step 2: Configure Backend Environment

Add the Keycloak environment variables to `apps/backend/.env`:

```bash
# Keycloak Server & Realm
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_REALM=medusa-commerce

# Keycloak Client Credentials
KEYCLOAK_CLIENT_ID=medusa
KEYCLOAK_CLIENT_SECRET=medusa-dev-secret-changeme-in-prod

# OIDC Scopes
KEYCLOAK_SCOPE="openid profile email"

# Medusa Backend Callback (storefront redirect after Keycloak auth)
# This is where Medusa returns the browser AFTER Keycloak auth — it must point to the STOREFRONT callback page (port 8000), NOT the backend (9000). The realm's registered OIDC redirect_uris (the backend :9000/auth/.../callback) are a separate handshake step and stay as-is. For other regions, swap the country code.
KEYCLOAK_CALLBACK_URL=http://localhost:8000/nz/account/auth-callback
```

> ⚠️ **Development Only**: The client secret `medusa-dev-secret-changeme-in-prod` is a local placeholder. Change it in production and rotate it regularly. Use a secrets manager (AWS Secrets Manager, Vault) for prod deployment.

## Run the Stack

Start B2B-Commerce with Keycloak:

```bash
task up
```

**What happens**:
- Medusa backend, Next.js storefront, PostgreSQL, Redis, and Keycloak all boot
- Keycloak adds ~10–15 seconds to startup time
- Keycloak healthcheck (OpenID Connect discovery endpoint) has a `start_period: 90s`
- When you see "frontend running on :8000", all services are live

**Standalone Keycloak commands**:

| Task | Purpose |
|------|---------|
| `task keycloak:up` | Start Keycloak only (if already running other services) |
| `task keycloak:down` | Stop Keycloak only |
| `task keycloak:db-init` | Create Keycloak database (idempotent; safe to re-run) |
| `task keycloak:health` | Check realm discovery endpoint (`/.well-known/openid-configuration`) |

## Demo: Storefront SSO Login

1. **Open the storefront**: http://localhost:8000
2. **Navigate to login**: Click login or go to `http://localhost:8000/account`
3. **Click "Sign in with SSO"** (button on the login page)
4. **You are redirected to Keycloak**
5. **Log in with the demo user**:
   - Email: `sso.buyer@demo.com`
   - Password: `SsoBuyer2026!`
6. **Authorize the application** (consent screen if this is the first login)
7. **Redirect back to the storefront**: You are now logged in as a customer

## OIDC Flow (Auth-Code)

```mermaid
sequenceDiagram
    participant Browser
    participant Storefront as Next.js Storefront
    participant Backend as Medusa Backend
    participant Keycloak as Keycloak IdP

    Browser->>Storefront: Click "Sign in with SSO"
    Storefront->>Backend: GET /auth/customer/vymalo-keycloak
    Backend->>Backend: Generate auth code request + state token
    Backend->>Browser: Redirect to Keycloak authorize endpoint
    Browser->>Keycloak: GET /realms/medusa-commerce/protocol/openid-connect/auth?client_id=medusa&...
    Keycloak->>Browser: Show login form
    Browser->>Keycloak: POST credentials (sso.buyer@demo.com / SsoBuyer2026!)
    Keycloak->>Keycloak: Validate user; issue ID + refresh tokens
    Keycloak->>Browser: Redirect to callback with auth code
    Browser->>Backend: GET /auth/customer/vymalo-keycloak/callback?code=...
    Backend->>Keycloak: POST /token (exchange code for ID token)
    Keycloak->>Backend: Return ID + access tokens
    Backend->>Backend: Validate token issuer + signature
    Backend->>Backend: Create/link customer session
    Backend->>Browser: Set session cookie; redirect to /account
    Browser->>Storefront: GET /account (authenticated)
    Storefront->>Browser: Render account dashboard
```

## Admin Dashboard — Important Limitation

**The Medusa admin dashboard (`@medusajs/dashboard`) is a prebuilt SPA that ONLY supports email/password login.** The login page displays only the email/password form; there is no one-click "Login with Keycloak" button.

### What IS Supported

- ✅ The backend SSO route `/auth/user/vymalo-keycloak` is **enabled** and works at the protocol level
- ✅ Developers can use the token/redirect flow programmatically or via curl
- ✅ The admin dashboard **accepts tokens** from any auth method in API requests

### What Is NOT Supported

- ❌ No one-click "Login with Keycloak" button on the admin login page
- ❌ Adding this button requires patching or forking the prebuilt dashboard (`@medusajs/dashboard`)
- ❌ OceanSoft's public B2B-Commerce distribution does not include a patched admin dashboard

### Workaround for Dev/Testing

If you need admin SSO for development:

1. **Use the backend API directly** — obtain a token programmatically:
   ```bash
   # Exchange credentials for a token via Keycloak
   curl -X POST http://keycloak:8080/realms/medusa-commerce/protocol/openid-connect/token \
     -d "client_id=medusa&client_secret=medusa-dev-secret-changeme-in-prod&grant_type=password&username=admin@oceansoft.io&password=admin"
   ```

2. **Or use the storefront SSO**, then access admin APIs via the token (backend API authentication is separate from the dashboard UI)

3. **Or stay with email/password** for admin login — the admin account is not customer-facing

**Production Hardening**: A production B2B-Commerce deployment would need to either:
- Implement a custom dashboard with SSO support (out of scope for this reference architecture)
- Use a separate identity provider (Okta, Auth0) that provides a managed admin portal
- Maintain separate admin/customer auth paths (email/password for admin, SSO for customers)

## Observability

Keycloak exposes Prometheus metrics on port 9000:

```
http://ec_keycloak:9000/metrics
```

### Grafana Dashboard

A pre-configured "Keycloak IdP Health" panel is included in the observability stack. It shows:
- **Keycloak Target Up** — 1 = running, 0 = down
- **HTTP Request Rate** — requests/sec by path

To access the dashboard:
1. Start the stack: `task up`
2. Open Grafana: http://localhost:3000 (default: admin / admin)
3. Go to **Dashboards** → search for "Keycloak"

### Metrics Limitations

- **Login events** (login attempts, successful logins, failures) require the Keycloak Events Listener SPI to be enabled in the realm config. This is **not enabled in the shipped local-dev realm** (out of scope for Phase 1).
- **To enable event listeners** in production: configure `~/keycloak/data/import/realm-medusa-commerce.json` to include an event listener, then re-import the realm.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Keycloak login redirects to storefront but you stay on login page | Issuer mismatch (`http://localhost:8080` ≠ `http://keycloak:8080`) | Ensure `/etc/hosts` has `127.0.0.1 keycloak` and `KEYCLOAK_URL` is `http://keycloak:8080` |
| "Provider not found" error in backend logs | `KEYCLOAK_URL` or other env vars not set in `apps/backend/.env` | Verify `.env` has all 6 vars (URL, REALM, CLIENT_ID, CLIENT_SECRET, SCOPE, CALLBACK_URL); restart backend with `docker compose restart medusa` |
| Keycloak container fails to start | Database not initialized | Run `task keycloak:db-init` to create the Keycloak database |
| Keycloak health check times out | Keycloak is still booting (start_period: 90s) | Wait 90 seconds; check logs with `docker compose logs keycloak` |
| Token validation fails ("iss claim mismatch") | Backend sees issuer as `http://localhost:8080` but realm has `http://keycloak:8080` | Check `/etc/hosts` entry; redeploy backend to pick up the hostname change |
| Demo user `sso.buyer@demo.com` does not exist | Realm import failed | Verify `keycloak/data/import/realm-medusa-commerce.json` exists and has the demo users; re-run `task keycloak:db-init` |
| After SSO login the browser lands on the Medusa backend (:9000) / a JSON or blank page instead of the storefront account page | `KEYCLOAK_CALLBACK_URL` is pointing at the backend instead of the storefront callback | Set `KEYCLOAK_CALLBACK_URL=http://localhost:8000/<cc>/account/auth-callback` (e.g., `nz` for New Zealand region) and restart the backend with `docker compose restart medusa` |

## Security Notes (Local Dev Only)

### What's Insecure Here

- **Demo user password is in the realm export** (`realm-medusa-commerce.json`)
- **Client secret is in `.env`** and committed to `.env.template`
- **Keycloak runs on HTTP** (no TLS)
- **Realm is pre-seeded** with hardcoded demo users

### Production Requirements

Before deploying to production, you MUST:

1. **Rotate the client secret**: Generate a new secret in Keycloak; update it in your secrets manager (Vault, AWS Secrets Manager)
2. **Use a managed Keycloak** or self-hosted with TLS and backups
3. **Integrate your identity provider**: LDAP, Active Directory, SAML, or social login (GitHub, Google)
4. **Enable event listeners** to audit login attempts and token issuance
5. **Set up token signing** with a proper key pair (not the self-signed cert)
6. **Review Keycloak security docs**: https://www.keycloak.org/documentation (not in scope for this Phase 1 reference)

## Next Steps

- **Deploy to AWS** (Phase 3): Use AWS Cognito or self-hosted Keycloak on ECS; update `KEYCLOAK_URL` to the prod domain
- **Add social login**: Configure GitHub/Google/SAML in the realm
- **Custom admin dashboard**: If you need admin SSO, fork `@medusajs/dashboard` and add a Keycloak button
- **Event logging**: Enable Keycloak event listeners for audit trails

## References

- **Keycloak Official Docs**: https://www.keycloak.org/documentation
- **Medusa Auth Provider Integration**: `apps/backend/src/modules/auth/` (search for `vymalo-keycloak`)
- **Local Realm Export**: `infra/keycloak/data/import/realm-medusa-commerce.json`
- **Docker Service**: See `docker-compose.yml` under `keycloak` service
