FROM node:24-alpine

WORKDIR /server

RUN npm install -g pnpm@10.11.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY patches/ ./patches/
COPY apps/backend/package.json ./apps/backend/
COPY apps/storefront/package.json ./apps/storefront/

RUN pnpm install --no-frozen-lockfile

COPY . .

EXPOSE 9000 5173 8000

ENTRYPOINT ["./scripts/start.sh"]
