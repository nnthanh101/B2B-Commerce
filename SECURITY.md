# Security Policy

Security underpins the **Trust** in our 3T governance and the regulated FSI/Energy posture described in the [blueprint](./docs/b2b-blueprint.md).

## Supported versions

| Version                    | Supported      |
| -------------------------- | -------------- |
| `2.x` (current foundation) | ✅             |
| `1.x` (2022 line)          | ❌ end-of-life |

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Email **<security@oceansoft.io>** (cc <nnthanh101@gmail.com>) with:

- a description and impact assessment,
- reproduction steps or a proof of concept,
- affected component (`apps/backend`, `apps/storefront`, `infra/`, AI gateway).

You can expect an acknowledgement within **3 business days** and a remediation plan once triaged. Please allow a reasonable disclosure window before any public discussion.

## Handling expectations

- Secrets never live in the repo; they resolve from **AWS Secrets Manager** / SSM at runtime (see `TODO.md`, gap G-07).
- Dependencies, IaC, secrets, and containers are scanned in CI before release.
- Every AI-agent write action is policy-gated, human-approved where required, and recorded as immutable audit evidence (blueprint §6).
