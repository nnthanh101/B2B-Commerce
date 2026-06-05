# Golden Path — Demo Digital-Commerce End-to-End in 15 Minutes

> **Doc identity**: This is the **Golden Path** — the canonical happy-path demo that proves the wedge (quote-assisted B2B with dual-persona). If you only read one Digital-Commerce doc to evaluate the product, read this one.
> **Audience**: HITL, prospect demo, alpha customer OceanSoft, first-week dev
> **Time**: 5 min setup + 10 min Golden Path demo = 15 min total
> **Phase**: 1 (local-first, no AWS provisioning)
> **Companion docs**: [quickstart.md](./quickstart.md) (10-step prerequisites + verify) · [architecture/local-mvp.md](./architecture/local-mvp.md) (4-service topology SSOT) · [discovery-brief.md](./discovery-brief.md) (the "why" + 5 wedge stories)

---

## When to Use This Doc

- **You** want to demo Digital-Commerce to a prospect, a stakeholder, or yourself in 15 minutes.
- **You** want to prove the buyer-employee + admin/sales-manager wedge actually runs end-to-end (not slide-deck claims).
- **You** are NOT here to learn every `task` target (see [Taskfile.yml](../Taskfile.yml)) or every topology fact (see [architecture/local-mvp.md](./architecture/local-mvp.md)).

If you are setting up the repo for the first time and need to verify prerequisites step-by-step, read [quickstart.md](./quickstart.md) first, then return here.

---

## Pre-Demo Checklist (2 min)

| Check | Command | Expected |
|---|---|---|
| Repo cloned & .env present | `ls apps/backend/.env apps/storefront/.env` | both files exist |
| Docker Desktop running | `docker info \| head -5` | no error |
| Stack started | `task up` | exits 0 |
| 4 services healthy | `task ps` | `ec_postgres_b2b`, `ec_redis_b2b`, `ec_backend_b2b`, `ec_storefront_b2b` all `Up` |
| Seed data loaded | `task seed` | exits 0 |
| Admin UI reachable | open http://localhost:9000/app | login screen |
| Storefront reachable | open http://localhost:8000 | landing page |

If any check fails → see [Troubleshooting](#troubleshooting-top-5) below.

---

## Golden Path: Quote → Approval → PO (10 min, dual-persona)

> **Wedge story proof points**: this Golden Path executes [discovery-brief.md](./discovery-brief.md) US-DB-01 (fresh-laptop skeleton), US-QA-02 (storefront quote request), US-AP-03 (admin approves → PO). Both personas must appear; admin-only or buyer-only demo = `INVISIBLE_PRIMARY_USER` anti-pattern.

### Step 1 — Provision the demo company (admin/sales-manager persona, 2 min)

1. Open **http://localhost:9000/app** → login with seeded admin (`admin@oceansoft.io` / `admin`).
2. Navigate to `/app/companies` → click **Add company**.
3. Fields: name `Test Corp`, industry `Energy`, country `AU`.
4. Add employee: email `buyer@testcorp.example`, role `buyer-employee`, spending limit `10000`.

You are now the **admin** who just onboarded a customer company with a regulated-industry buyer.

### Step 2 — Submit a quote request (buyer-employee persona, 3 min)

1. Open **http://localhost:8000/gb/account** in a fresh incognito window → login as `buyer@testcorp.example` (the login form renders at `/account`, not `/account/login`).
2. Browse the storefront, add 2–3 SKUs to cart (total under 10000 AUD to stay within spending cap).
3. Click **Request Quote** on the cart page.
4. Confirm the quote appears at `/gb/account/quotes` with status `pending_approval`.

You have now executed the **buyer-employee** half of the wedge. The cart never converted to an order; it was routed to approval per Digital-Commerce's "every cart enters an approval workflow by default" design.

### Step 3 — Approve the quote (admin/sales-manager persona, 2 min)

1. Return to the admin window at **http://localhost:9000/app/quotes**.
2. Find the new quote from `Test Corp` → click **Review**.
3. Inspect line items and total → click **Approve**.
4. Status transitions to `approved` (instantaneous, synchronous workflow).

### Step 4 — Verify the PO appeared on the buyer side (buyer-employee persona, 1 min)

1. Return to the buyer storefront window at **http://localhost:8000/gb/account/orders**.
2. New order is visible with an auto-generated PO number derived from the approved quote.

### Demo passes if

All four steps succeed without errors. **Both personas have appeared.** The audit trail (approver, approved-at timestamp, quote-id → PO-id link) is visible in the admin UI's approval record.

---

## Troubleshooting (Top 5)

Recovery commands for the most common Golden-Path-breaking failures. Full operator troubleshooting belongs in [quickstart.md](./quickstart.md).

| # | Symptom | Recovery |
|---|---|---|
| 1 | `task up` fails with "port 9000 in use" | `lsof -i :9000` → `kill -9 <PID>` → `task down && task up` |
| 2 | Backend won't start — "Database connection refused" | `docker compose logs postgres \| tail -10` → if corrupt: `docker volume rm postgres_data` → `task up` → `task seed` |
| 3 | Storefront shows stale prices after seed | `docker compose exec redis redis-cli FLUSHALL` → `docker compose restart storefront` |
| 4 | Quote does not appear in `/admin/quotes` after Step 2 | check `docker compose logs ec \| tail -30` for workflow error; the workflow is `create-quote.ts` |
| 5 | Container build fails — `npm ERR! code ERESOLVE` | `task down && docker system prune -a && task up` (warning: prunes all images) |

---

## After the Golden Path — Where to Go Next

| You want to… | Read |
|---|---|
| Understand WHY this product exists (5 user stories + LEAN waste analysis) | [discovery-brief.md](./discovery-brief.md) |
| Understand HOW the 4 services connect (topology, network, volumes, Phase 2 AWS mapping) | [architecture/local-mvp.md](./architecture/local-mvp.md) |
| Understand the competitive positioning + unfair-advantage stack | [b2b-blueprint.md](./b2b-blueprint.md) |
| See the honest enterprise GTM readiness score (49/100) | [readiness-scorecard.md](./readiness-scorecard.md) |
| Run every `task` target | [`Taskfile.yml`](../Taskfile.yml) |
| Browse all architecture decisions (ADRs) | [architecture/README.md](./architecture/README.md) (14 ADRs, kebab-lowercase naming) |
