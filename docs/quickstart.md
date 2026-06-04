# Quickstart — Run Digital-Commerce Locally

Get the full B2B marketplace running in Docker in under 10 minutes.

## Prerequisites

- Docker 24+ and docker-compose
- Node.js 22+ (for local package manager tasks; most work happens inside containers)
- pnpm 10.11.1+ (matches workspace lockfile)
- Git

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/nnthanh101/Digital-Commerce.git
cd Digital-Commerce

# 2. Copy environment templates (adjust credentials/API keys as needed)
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env
# Default .env values are safe for local development
```

## Start the Stack

```bash
# 3. Build and start all services (Medusa backend, Next.js storefront, Postgres, Redis)
task up
# Exit codes: 0 = success, expect ~90–120 seconds startup time
# Services should be live when you see "frontend running on :8000"
```

## Verify Services

```bash
# 4. Check that Medusa backend is responding (admin API)
curl -fsS http://localhost:9000/health
# Expected: 200 OK (JSON response)

# 5. Check storefront is responding
curl -fsS http://localhost:8000
# Expected: 200 OK (HTML response)

# 6. List running containers
docker compose ps
# Expected: 4 containers with State "Up"
#   ec_backend_b2b, ec_storefront_b2b,
#   ec_postgres_b2b, ec_redis_b2b
```

## Access the Application

**Medusa Admin Dashboard**: http://localhost:9000/app
- Login with email/password from `.env` (defaults: `admin@oceansoft.io` / `admin`)
- Verify B2B routes exist: Companies, Quotes, Approvals (in left sidebar)

**Storefront**: http://localhost:8000
- B2B account dashboard at `/[countryCode]/account`
- Mock products pre-seeded (or run `task seed`)

## Run Tests

```bash
# 7. Playwright E2E smoke test (login → create company → quote → approval)
task test:e2e
# Expected: All tests pass; HTML report generated at tmp/Digital-Commerce/test-results/playwright-report/index.html

# 8. Unit tests
task test
# Expected: Pass (pnpm turbo test across all workspaces)

# 9. Linting
task lint
# Expected: Pass (ESLint, Prettier across workspaces)
```

## Validate Infrastructure Code

```bash
# 10. Check Terraform skeleton is valid (no AWS resources yet)
task tf:validate
# Expected: exit 0 (all .tf files are syntactically correct)

# 11. Generate infracost report (cost forecast when AWS resources are added)
task tf:cost
# Expected: JSON report saved to tmp/Digital-Commerce/test-results/infracost-breakdown.json
# Note: $0 cost at P1 (no real resources provisioned yet)
```

## Common Tasks

```bash
task logs          # View logs (all services)
task seed          # Seed database with initial data
task down          # Stop everything
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| Port 9000 already in use | `lsof -i :9000`; kill process or change `docker-compose.yml` |
| Container still starting | Wait 10 seconds; check `docker compose logs medusa` |
| Database migration errors | Run `task seed` inside running container |
| pnpm: command not found | Use `docker compose exec medusa pnpm <command>` instead |

## Next Steps

- **Understand the architecture**: Read `docs/architecture.md`
- **Modify B2B flows**: Edit `packages/medusa-plugin-b2b/src/modules/` or `apps/storefront/`
- **Add AWS resources**: See `infra/terraform/` and `docs/architecture.md#v0-3-milestone`
- **Deploy to staging**: Planned Phase 3 (v0.3 milestone)

## Support

Questions? Check the README.md for links to community resources and support contacts.
