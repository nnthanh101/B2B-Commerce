---
title: "Index: Authentication & SSO"
description: Single Sign-On (SSO) and authentication documentation for B2B-Commerce — Keycloak integration, OIDC flows, and token validation.
tags: [auth, sso, keycloak, oidc]
source_refs:
  - path: "apps/storefront/src/app/[countryCode]/(main)/account/@login/auth-callback"
    last_compiled: "2026-06-09"
  - path: "infra/keycloak/"
    last_compiled: "2026-06-09"
last_compiled: "2026-06-09T00:00:00Z"
---

# Index: Authentication & SSO

Single Sign-On (SSO) integration for B2B-Commerce users — company employees authenticate via enterprise Keycloak realms, with role-based access control (buyer, sales-manager, admin).

| Page | Purpose |
|------|---------|
| [Concept: Keycloak SSO](./keycloak-sso.md) | OIDC realm configuration, token validation, employee group mapping to B2B roles |

## Authentication Flow

```
Employee Login
    ↓ (OIDC redirect to Keycloak)
Keycloak Realm (company-specific)
    ↓ (token + groups claim)
Storefront Auth-Callback
    ↓ (sync employee + roles)
B2B Approval Workflow
```

## Related Documentation

- [Entity: Approval Module](../modules/approval-module.md) — role-based approval gates that depend on auth
- [Entity: Company Module](../modules/company-module.md) — employee group membership and role assignment
