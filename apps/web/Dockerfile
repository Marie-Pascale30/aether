# syntax=docker/dockerfile:1
# Image du front. À construire depuis la racine du monorepo :
#   docker build -f apps/web/Dockerfile --build-arg API_URL=http://api:4100 -t aether-web .
# API_URL est figé au build : Next sérialise les réécritures (/api → API) dans le serveur autonome.

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── Dépendances ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --workspace @aether/web --workspace @aether/shared --include-workspace-root

# ─── Compilation (serveur autonome « standalone ») ───────────────────────────
FROM deps AS build
ARG API_URL=http://api:4100
ENV API_URL=${API_URL} NEXT_STANDALONE=1
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @aether/shared && npm run build -w @aether/web

# ─── Exécution : uniquement les fichiers tracés par Next ─────────────────────
FROM base AS runtime
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static apps/web/.next/static
# Fichiers publics : service worker (hors ligne) et icônes de l'application installable.
COPY --from=build --chown=node:node /app/apps/web/public apps/web/public
USER node
EXPOSE 3100
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ > /dev/null || exit 1
CMD ["node", "apps/web/server.js"]
