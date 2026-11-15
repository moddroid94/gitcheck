# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

# ---------------------------------------------------------------------------
# deps: full dependency tree, including devDependencies needed for the build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# build: compile the frontend into dist/
# Only build inputs are copied, so unrelated edits keep this layer cached.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# prod-deps: production dependencies only (tsx is a runtime dependency)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------------------
# runtime: slim base, no toolchain or devDependencies
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    DB_PATH=/app/data/github-monitor.db \
    GITHUB_TOKEN=

# Dependency and build layers come first so source edits stay cheap.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.ts ./
COPY src ./src

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["./node_modules/.bin/tsx", "server.ts"]
