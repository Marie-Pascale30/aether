# syntax=docker/dockerfile:1
# Image de l'API. À construire depuis la racine du monorepo :
#   docker build -f apps/api/Dockerfile -t aether-api .
# Cibles : « runtime » (par défaut, le serveur) et « migrate » (migrations + seed, tâche ponctuelle).

FROM node:24-alpine AS base
# OpenSSL est requis par le moteur de requêtes de Prisma.
RUN apk add --no-cache openssl
WORKDIR /app

# ─── Dépendances (toutes, pour compiler) ─────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Installation complète, sans filtre de workspace : le filtre omet les binaires optionnels de
# plateforme (esbuild, utilisé par tsx pour le seed).
RUN npm ci --ignore-scripts

# ─── Compilation ─────────────────────────────────────────────────────────────
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @aether/shared \
 && npm run prisma:generate -w @aether/api \
 && npm run build -w @aether/api

# ─── Migrations et seed (Prisma CLI et tsx viennent des dépendances de dev) ──
FROM build AS migrate
ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

# ─── Exécution : dépendances de production uniquement ────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts --workspace @aether/api --workspace @aether/shared \
 && npm cache clean --force
# Client Prisma généré (avec le moteur Alpine) et code compilé.
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 4100
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT:-4100}/api/health > /dev/null || exit 1
CMD ["node", "dist/main.js"]
