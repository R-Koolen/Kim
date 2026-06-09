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

RUN groupadd -g 1000 kim \
    && useradd -u 1000 -g kim -M -s /usr/sbin/nologin kim \
    && mkdir -p /app/data \
    && chown -R kim:kim /app

COPY --from=deps --chown=kim:kim /app/node_modules ./node_modules
COPY --chown=kim:kim package.json ./
COPY --chown=kim:kim src ./src
COPY --chown=kim:kim seed-assets ./seed-assets

USER kim
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "src/server.js"]
