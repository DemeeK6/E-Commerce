# Builds the React frontend and bakes it into a Caddy image. Caddy serves the
# site, proxies /api and /uploads to the API, and gets HTTPS certificates itself.
FROM node:24-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv
