# Infrastructure as Code — Terraform

All Terraform runs through the pinned **`nnthanh101/terraform`** container image so the toolchain is identical on every laptop and in CI — no host Terraform required.

```text
infra/
├── docker/terraform/Dockerfile   # builds nnthanh101/terraform:1.9.8 (terraform + tflint + aws-cli)
└── terraform/
    ├── local/                    # local data tier via the Docker provider (runnable today)
    └── aws/                      # AWS dev/staging/prod (Phase 2 — see docs/ASSESSMENT.md gaps)
```

## Build the runner image

```bash
make tf-build           # docker build -t nnthanh101/terraform:1.9.8 infra/docker/terraform
```

## Local stack (Docker provider)

Stands up a Terraform-managed Postgres + Redis — the IaC equivalent of compose's data tier, proving the Terraform path end-to-end before any AWS account exists.

```bash
make tf-fmt             # terraform fmt -recursive
make tf-validate        # terraform init -backend=false && terraform validate
make tf-local-up        # terraform apply  (needs the Docker socket mounted)
make tf-local-down      # terraform destroy
```

> Use **either** `make up` (compose) **or** `make tf-local-up` (Terraform) at a time — both bind the same host ports (5432/6379). The Terraform stack mounts `/var/run/docker.sock` so the Docker provider can manage host containers.

Outputs (`terraform output`) give you the `DATABASE_URL` / `REDIS_URL` to drop into `apps/backend/.env`.

## AWS (Phase 2)

`aws/` is intentionally a stub. The module set (network, rds-postgres Multi-AZ, ecs-service, cloudfront-waf, appregistry dual-provider, finops-focus-export) and the sized cost baseline are tracked as gaps **G-01…G-09** in [`docs/ASSESSMENT.md`](../../docs/ASSESSMENT.md) and tasks in [`TODO.md`](../../TODO.md). The same `nnthanh101/terraform` image and tagging discipline (`awsApplication` + FinOps tags) carry over unchanged.

## Conventions

- **Pinned versions** (定量): Terraform `1.9.8`, providers constrained in `versions.tf`.
- **No state/secrets in git**: see `.gitignore`; pass secrets via `TF_VAR_*`.
- **Remote state** (S3 + DynamoDB lock) lands with the AWS stack — gap **G-06**.
