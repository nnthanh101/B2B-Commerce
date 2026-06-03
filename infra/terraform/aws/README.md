# AWS Terraform (Phase 2 — placeholder)

Intentionally empty until Phase 2. This directory reserves the **Fixed Location** (定位) for the AWS IaC so it never leaks into `local/` or the repo root.

Planned module set (each maps to an [`ASSESSMENT.md`](../../../docs/ASSESSMENT.md) gap):

| Module                | Purpose                                          | Gap  |
| --------------------- | ------------------------------------------------ | ---- |
| `network`             | VPC, 3-tier subnets, NAT, VPC endpoints          | G-04 |
| `rds-postgres`        | Multi-AZ, PITR, RPO/RTO targets                  | G-02 |
| `ecs-service`         | Reusable Fargate service                         | —    |
| `cloudfront-waf`      | Edge + managed WAF rules                         | —    |
| `appregistry`         | myApplications via dual-provider pattern         | G-03 |
| `security-baseline`   | KMS, IAM boundaries, CloudTrail/Config/GuardDuty | G-07 |
| `finops-focus-export` | FOCUS 1.2 export + sized cost baseline           | G-01 |
| `observability`       | dashboards, alarms, SLOs                         | G-08 |

Prerequisites before any `apply`: new AWS account + IAM Identity Center, **S3 + DynamoDB remote state** (G-06), and **GitHub OIDC → AWS** federation. Run everything through the `nnthanh101/terraform` image.
