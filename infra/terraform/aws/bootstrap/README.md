# bootstrap — Terraform Genesis Config

**Run-once per environment.** Creates the S3 state bucket used by all other root modules.

## Why a Separate Bootstrap?

The `local/`, `dev/`, `staging/`, `prod/` root modules all store their state in an S3 bucket.
That bucket must exist BEFORE those root modules can `terraform init`. If the bucket were created
inside `foundation` (the prior approach), it would be a self-referential deadlock:

```
init needs bucket → apply creates bucket → bucket is its own state backend
                  ↑__________________________________|
                        circular dependency
```

Bootstrap breaks the cycle by using a **local filesystem backend**. Its own state
(`/tmp/dc-bootstrap.tfstate`) is ephemeral. The bucket it creates is the durable artifact.

## Usage

### Tier-2: LocalStack (no AWS credentials needed)

```bash
export AWS_DEFAULT_REGION=ap-southeast-2
task tf:local:up
task tf:bootstrap:local          # creates b2b-commerce-sandbox-tfstate in LocalStack
awslocal s3 ls                   # verify bucket visible
task tf:local:provision          # workload init -backend-config=backend-local.hcl + apply
task tf:local:assert             # state-object-in-bucket proof + workload assertions
```

### Production path (real AWS — HITL only, Principle I)

```bash
# HITL executes — agent MUST NOT run terraform apply against real AWS
export AWS_PROFILE=<dev-profile>
terraform -chdir=infra/terraform/aws/bootstrap init
terraform -chdir=infra/terraform/aws/bootstrap plan -var="environment=dev"
# [HITL reviews plan]
terraform -chdir=infra/terraform/aws/bootstrap apply -var="environment=dev"
```

## State Bucket Naming

`${project}-${environment}-tfstate`

| Environment | Bucket name |
|-------------|-------------|
| sandbox (LocalStack) | `b2b-commerce-sandbox-tfstate` |
| dev | `b2b-commerce-dev-tfstate` |
| prod | `b2b-commerce-prod-tfstate` |

## Security Controls

| Control | Implementation |
|---------|---------------|
| Versioning | Enabled (all environments) |
| SSE | AES256 |
| Public access | All-blocked |
| Noncurrent expiry | 90 days (configurable; 0 = disabled) |
| Destroy protection | `lifecycle.prevent_destroy` (set true for prod) |
