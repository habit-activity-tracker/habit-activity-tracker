# syntax=docker/dockerfile:1

# Build the API and the browser bundle from the locked workspace dependencies.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci

COPY api api
COPY web web
RUN npm run build

# The runtime contains only production dependencies and compiled assets. Runtime
# configuration, including every secret, is supplied by Docker Compose.
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    WEB_DIST_DIR=/app/web/dist

COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev

COPY --from=build /app/api/dist api/dist
COPY --from=build /app/web/dist web/dist

USER node
EXPOSE 3000

CMD ["node", "api/dist/src/server.js"]
