# ──────────────────────────────────────────────────────────────────────────
# Digital-Commerce — Medusa v2 Backend
# Multi-stage: deps → build → runtime | dev target for docker-compose
# Platform: linux/arm64 (ECS Fargate Graviton) + buildx multi-arch hints
# Port: 9000 (Medusa API) | 7001 (Medusa Admin)
# ──────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=20
ARG MEDUSA_VERSION=2.15.5

# ── Stage: deps ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps

# Install pnpm via corepack (avoids npm install of pnpm on every build)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests first (layer cache: only re-run install on changes)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

# Production deps only in this stage
RUN pnpm install --filter @digital-commerce/backend --frozen-lockfile --prod

# ── Stage: build ─────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

# Install ALL deps (including devDependencies needed for build)
RUN pnpm install --filter @digital-commerce/backend --frozen-lockfile

# Copy source and build
COPY apps/backend/ ./apps/backend/
RUN pnpm --filter @digital-commerce/backend run build

# ── Stage: runtime ───────────────────────────────────────────────────────────
# Minimal production image — only what Medusa needs to run
FROM node:${NODE_VERSION}-alpine AS runtime

# Non-root user (uid 1000 matches ECS task execution user convention)
RUN addgroup -S medusa && adduser -S -G medusa -u 1000 medusa

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=medusa:medusa /app/node_modules ./node_modules
COPY --from=deps --chown=medusa:medusa /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy compiled output from build stage
COPY --from=build --chown=medusa:medusa /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=medusa:medusa /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=medusa:medusa /app/package.json ./package.json

USER medusa

WORKDIR /app/apps/backend

# Medusa API port
EXPOSE 9000
# Medusa Admin port (served by same process in dev; separate in prod if needed)
EXPOSE 7001

# Health check — Medusa exposes /health by default
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:9000/health || exit 1

CMD ["node", "dist/main.js"]

# ── Stage: dev ────────────────────────────────────────────────────────────────
# Used by docker-compose.yml (target: dev). Mounts source as volume.
# NOT published to GHCR; local use only.
FROM node:${NODE_VERSION}-alpine AS dev

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace manifests (volumes will overlay apps/backend at runtime)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/backend/package.json ./apps/backend/

# Install all deps including devDependencies (hot-reload needs them)
RUN pnpm install --filter @digital-commerce/backend --frozen-lockfile

EXPOSE 9000
EXPOSE 7001

CMD ["pnpm", "--filter", "@digital-commerce/backend", "run", "dev"]
