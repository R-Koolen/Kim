# syntax=docker/dockerfile:1

# ---- deps: compile better-sqlite3's native addon -----------------------------
FROM node:20.18-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: slim image, non-root, only what's needed to run ---------------
FROM node:20.18-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/kim.sqlite3 \
    PHOTO_DIR=/app/data/photos

# node:* images already include user `node` at uid/gid 1000 — use it directly
RUN mkdir -p /app/data && chown -R node:node /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node seed-assets ./seed-assets

USER node
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "src/server.js"]
