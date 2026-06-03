# Digital-Commerce — developer commands. Run `make help` for the list.
# Local app stack = docker compose. IaC = Terraform via the nnthanh101/terraform image.

SHELL    := /bin/sh
COMPOSE  ?= docker compose
TF_IMAGE ?= nnthanh101/terraform:1.9.8
PWD_DIR  := $(shell pwd)

# Terraform-in-Docker: mount the stack + the docker socket (for the docker provider).
TF_LOCAL = docker run --rm \
  -v "$(PWD_DIR)/infra/terraform:/work" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -w /work/local $(TF_IMAGE)

.DEFAULT_GOAL := help

.PHONY: help env up down down-v build logs ps migrate admin shell \
        tf-build tf-fmt tf-validate tf-local-up tf-local-down

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'

## ----- Local app stack (docker compose) -----

env: ## Create apps/*/.env from templates (idempotent)
	@cp -n apps/backend/.env.template apps/backend/.env 2>/dev/null || true
	@cp -n apps/storefront/.env.template apps/storefront/.env 2>/dev/null || true
	@echo "✔ .env files ready — set secrets + NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"

build: ## Build the app image
	$(COMPOSE) build

up: env ## Start the full local stack (postgres, redis, backend, storefront)
	$(COMPOSE) up --build -d
	@echo "Backend  → http://localhost:9000  (admin: /app)"
	@echo "Store    → http://localhost:8000"

down: ## Stop the stack
	$(COMPOSE) down

down-v: ## Stop the stack and DELETE volumes (resets the database)
	$(COMPOSE) down -v

logs: ## Tail all logs (use: make logs SVC=backend)
	$(COMPOSE) logs -f $(SVC)

ps: ## Show running services
	$(COMPOSE) ps

migrate: ## Run database migrations
	$(COMPOSE) exec backend pnpm medusa db:migrate

admin: ## Create an admin user: make admin EMAIL=you@x.com PASSWORD=secret
	$(COMPOSE) exec backend pnpm medusa user -e "$(EMAIL)" -p "$(PASSWORD)"

shell: ## Open a shell in the backend container
	$(COMPOSE) exec backend sh

## ----- Infrastructure as Code (Terraform via nnthanh101/terraform) -----

tf-build: ## Build the nnthanh101/terraform runner image
	docker build -t $(TF_IMAGE) infra/docker/terraform

tf-fmt: ## terraform fmt (recursive) over infra/terraform
	docker run --rm -v "$(PWD_DIR)/infra/terraform:/work" -w /work $(TF_IMAGE) fmt -recursive

tf-validate: ## terraform validate the local stack (offline)
	$(TF_LOCAL) init -backend=false
	$(TF_LOCAL) validate

tf-local-up: ## terraform apply the local Docker data tier
	$(TF_LOCAL) init
	$(TF_LOCAL) apply -auto-approve

tf-local-down: ## terraform destroy the local Docker data tier
	$(TF_LOCAL) destroy -auto-approve
