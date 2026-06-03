# Local Development Runbook

Local-first stack for Digital-Commerce, based on the official [Medusa 2.x Docker guide](https://docs.medusajs.com/learn/installation/docker) (version-matched to 2.15.5). Two ways to run the data tier: **docker compose** (default) or **Terraform** (IaC parity). Use one at a time — both bind `5432`/`6379`.

## Prerequisites

- Docker + Docker Compose.
- For Terraform: the `nnthanh101/terraform` image (`make tf-build`). No host Terraform needed.

## 1. Bring up the stack

```bash
make up        # = docker compose up --build -d  (postgres, redis, backend, storefront)
make logs      # tail everything;  make logs SVC=backend  for one service
make ps        # service status
```

| Service    | URL                         | Notes                   |
| ---------- | --------------------------- | ----------------------- |
| Backend    | <http://localhost:9000>     | REST + Store/Admin APIs |
| Admin      | <http://localhost:9000/app> | Vite HMR on :5173       |
| Storefront | <http://localhost:8000>     | Next.js 15              |
| Postgres   | localhost:5432              | `medusa` / `medusa`     |
| Redis      | localhost:6379              | —                       |

`make up` runs `make env` first, copying `apps/*/.env.template` → `.env` if missing. Migrations run automatically on backend start (`start.sh`).

## 2. Create an admin user

```bash
make admin EMAIL=you@oceansoft.io PASSWORD=supersecret
```

Log in at <http://localhost:9000/app>.

## 3. Wire the storefront (publishable key)

The storefront **exits at startup without `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`**. After logging into Admin:

1. **Settings → API Key Management** → create a **Publishable API Key** (`pk_...`).
2. Set it in `apps/storefront/.env`: `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...`
3. `docker compose up storefront -d`

## 4. Everyday commands

```bash
make migrate   # run DB migrations
make shell     # shell in the backend container
make down      # stop (keeps data)
make down-v    # stop + delete volumes (DB reset)
```

## 5. IaC parity (Terraform, optional)

```bash
make tf-build        # build nnthanh101/terraform:1.9.8
make tf-validate     # fmt-check + validate (offline)
make tf-local-up     # apply: Terraform-managed postgres + redis (Docker provider)
make tf-local-down   # destroy
```

`terraform output database_url` / `redis_url` give the connection strings for `apps/backend/.env`. See [`infra/terraform/README.md`](../infra/terraform/README.md).

## Troubleshooting

- **`./start.sh: not found`** — the script has CRLF endings. `.gitattributes` enforces LF; re-checkout if your editor changed it.
- **Postgres SSL error** — handled: `medusa-config.ts` disables SSL locally. Set `DATABASE_SSL=true` only for RDS (Phase 2).
- **Storefront can't reach backend in the browser** — `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is set to the internal `http://backend:9000` for SSR. If browser-side links need it, switch to `http://localhost:9000` in `docker-compose.yml` and rebuild the storefront.
- **Port already in use** — another Postgres/Redis is running, or you started both compose **and** `tf-local-up`. Stop one.
- **Container name conflicts** — another Medusa project uses `dc_*` names; change `container_name`/ports in `docker-compose.yml`.
