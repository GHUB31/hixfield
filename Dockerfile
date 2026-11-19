# Multi-stage Node 22 build for Vyolab Studio (forked from Hixfield).
# Uses native Node 22 throughout so better-sqlite3 ABI matches cleanly on arm64 & amd64,
# and installs ffmpeg in the runtime stage for Speak WAV conversion and local motion rendering.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund \
    && npm rebuild better-sqlite3 \
    && node -e "const D = require('better-sqlite3'); new D(':memory:').prepare('select 1 as ok').get();"

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/data \
    SKILLS_DIR=/app/vendor/higgsfield-skills \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/vendor/higgsfield-skills ./vendor/higgsfield-skills

RUN mkdir -p /app/data && chown node:node /app/data
RUN node -e "const D = require('better-sqlite3'); new D(':memory:').prepare('select 1 as ok').get();"

USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
