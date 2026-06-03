# Local development image for the Digital-Commerce monorepo (Medusa backend + admin
# and the Next.js storefront). Both the `backend` and `storefront` compose services
# reuse this image; the storefront overrides the entrypoint to start-storefront.sh.
#
# Follows the official Medusa 2.x Docker guide (version-matched to 2.15.5):
#   https://docs.medusajs.com/learn/installation/docker
FROM node:20-alpine

# Medusa recommends /server (not /app) to avoid Admin build path conflicts.
WORKDIR /server

# Toolchain: pnpm via corepack (pinned), libc6-compat for native deps on Alpine.
RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

# Resolve the pnpm workspace graph first for better layer caching: copy the
# workspace manifests + every app's package.json before installing.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/
RUN pnpm install --frozen-lockfile

# App source (overlaid by the bind mount in docker-compose for live reload).
COPY . .

# Entry scripts must be executable and LF-terminated (see .gitattributes).
RUN chmod +x ./start.sh ./start-storefront.sh

# 9000 = backend API + Admin, 5173 = Admin Vite HMR, 8000 = storefront
EXPOSE 9000 5173 8000

ENTRYPOINT ["./start.sh"]
