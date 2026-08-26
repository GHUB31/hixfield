# Build with bun (matches bun.lock), run on plain Node 22.
# The runtime stage needs ffmpeg for Speak audio conversion.
#
# better-sqlite3 note: bun reports Node 26's ABI, so a native binding produced
# during bun install would not load under the Node 22 runtime (and the bun
# image has no compiler toolchain anyway). Install scripts are skipped during
# bun install; a dedicated Node 22 stage runs npm rebuild instead, which
# fetches the official prebuilt linux binding for Node 22's ABI. next build
# then traces that binding into the standalone output.

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM node:22-bookworm-slim AS sqlite
WORKDIR /app
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm rebuild better-sqlite3 \
    && node -e "const D = require('better-sqlite3'); new D(':memory:').prepare('select 1 as ok').get();"

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=sqlite /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/app/data

# next.config.ts marks better-sqlite3 as a server external package, so the
# standalone output ships it under node_modules with the Node 22 binding.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Job database and downloaded assets live here. Mount a volume at /app/data.
RUN mkdir -p /app/data && chown node:node /app/data

# Fail the image build early if the native sqlite binding cannot load under
# this Node version.
RUN node -e "const D = require('better-sqlite3'); new D(':memory:').prepare('select 1 as ok').get();"

USER node
EXPOSE 3000
CMD ["node", "server.js"]
