# syntax=docker/dockerfile:1

# ---- build: bundle the SPA with esbuild --------------------------------------
FROM node:20.18-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: non-root nginx compatible with read_only: true -----------------
# Plain nginx:alpine gives us full control of nginx.conf so we can redirect
# every startup write (pid, temp dirs) to /tmp — the only writable path when
# the container filesystem is read-only.
FROM nginx:1.27-alpine AS runtime

RUN addgroup -g 1000 -S kim \
    && adduser -u 1000 -S -G kim -H -s /sbin/nologin kim

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=kim:kim /app/dist /usr/share/nginx/html

USER kim
EXPOSE 8080
