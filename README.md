# AETHER

Jeu de puzzles contemplatif : chaque lien trouvé entre des symboles restaure une partie d'un jardin.

Monorepo **npm workspaces** :

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/web` | Le jeu (front) | Next.js 16 (App Router), React 19, TanStack Query, CSS Modules |
| `apps/api` | Règles, comptes, progression, classement, éditeur | NestJS 11, Prisma 6, PostgreSQL 17, pino |
| `packages/shared` | Contrat commun : types d'API, schémas Zod, règles de jeu pures | TypeScript, Zod 4, Vitest |

## Démarrer en local

Prérequis : Node 22+ et Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env    # puis remplace JWT_SECRET (32+ caractères aléatoires)
npm run setup                             # Postgres (Docker), build du paquet partagé, migrations, seed
npm run dev                               # shared (watch) + API :4100 + web :3100
```

Ouvre http://localhost:3100. L'éditeur est sur `/admin/niveaux`, avec le compte `ADMIN_EMAIL` /
`ADMIN_PASSWORD` de `apps/api/.env` (créé par le seed).

- **E-mails en local** : rien n'est envoyé ; chaque message (vérification d'adresse, mot de passe oublié)
  est écrit en JSON dans `apps/api/.mail-outbox/`, avec son lien.
- **Ports** : 3100 (web), 4100 (API) et 5433 (Postgres) évitent les habituels 3000 / 4000 / 5432.
- **Docker Hub injoignable ?** `docker pull mirror.gcr.io/library/postgres:17-alpine` puis
  `docker tag mirror.gcr.io/library/postgres:17-alpine postgres:17-alpine` (idem pour `node:24-alpine`).
- **Windows** : arrête `npm run dev` avant `npm run db:migrate`, sinon le moteur Prisma reste verrouillé.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Tout en mode développement |
| `npm run build` | Build de production (shared → api → web) |
| `npm run typecheck` | Types des trois workspaces |
| `npm test` | Tests unitaires des règles partagées |
| `npm run smoke -w @aether/api` | Test de bout en bout de l'API (serveur démarré, base seedée) |
| `npm run e2e -w @aether/web` | Parcours complet dans Chrome/Edge (serveurs démarrés), captures dans `apps/web/e2e/.shots/` |
| `npm run db:up` / `db:down` | Démarrer / arrêter Postgres |
| `npm run db:migrate` | Créer / appliquer une migration après modification de `schema.prisma` |

## Le jeu

- **Mondes** : chaque monde a son jardin (6 stades, qui ne font que croître) et son ambiance. Le premier
  est ouvert ; chaque monde entièrement restauré ouvre le suivant. Seed : Jardin des Origines (paires),
  Forêt des Échos (familles), Rivage des Suites (chemins).
- **Genres d'énigmes** : *paires* (2 cases), *familles* (3–4 cases, ordre indifférent), *suites*
  (3–5 cases dans l'ordre exact, numérotées à la sélection).
- **Étoiles** : ★★★ sans erreur ni indice · ★★ avec ≤ 2 erreurs et ≤ 1 indice · ★ sinon. Record :
  plus d'étoiles, puis le temps le plus court. Indices révélés un par un, à la demande.
- **Énigme du jour** (`/quotidien`) : la même pour tous, tirée chaque nuit (fuseau `DAILY_TIMEZONE`)
  dans une réserve hors parcours, en privilégiant les moins récemment jouées. Seule la première victoire
  du jour compte ; elle alimente une série de jours consécutifs et un résumé à partager (🟥🟩).
- **Comptes** : on joue tout de suite en invité ; créer un compte garde la progression, se connecter
  depuis un invité la fusionne. Vérification d'adresse, mot de passe oublié (lien 1 h, réponse muette),
  changement de mot de passe (déconnecte les autres appareils). Les invités ne sont pas classés.
- **Accessibilité** : plateau jouable au clavier (flèches, Entrée/Espace, Début/Fin), lien d'évitement,
  annonces pour lecteurs d'écran. **Réglages** (`/reglages`) : volume, effets, ambiance, animations
  (suivre le système / réduire / toujours), grands symboles.

## L'éditeur (`/admin`)

- **Mondes** : création, ordre (glisser-déposer ou ↑ ↓), thème du jardin, publication, réserve du jour.
- **Énigmes** : monde, genre et taille des liens, symboles (palette par famille), liens construits case
  par case, indices, brouillon/publication, duplication, test en un clic. Validation en direct, avec les
  mêmes règles que l'API.
- **Statistiques de conception** sous chaque énigme : joueurs, taux de réussite, temps médian, erreurs et
  indices moyens, étoiles, et **fausses pistes** les plus tentées (une ambiguïté se voit tout de suite).
  Les parties des administrateurs sont exclues.

## Architecture

**Le serveur est l'arbitre.** Le navigateur ne reçoit jamais les réponses : il ouvre une partie, soumet
des groupes de cases, et l'API tient le compte (liens, erreurs, indices, temps, étoiles, records). Les
mises à jour sont conditionnelles (doubles clics, onglets concurrents). Chaque coup est enregistré
(`Attempt`) pour les statistiques.

**Règles partagées.** Validation des énigmes, correspondance des groupes, étoiles, jardin, déblocage par
mondes, série du jour et résumé à partager vivent dans `packages/shared`, testés, et sont utilisés à
l'identique par l'API et l'éditeur.

**Observabilité.** Journaux JSON (pino), un identifiant par requête (`x-request-id`, repris dans les
réponses d'erreur), cookies jamais journalisés. Les erreurs du navigateur (`instrumentation-client`,
`error.tsx`) sont envoyées à `POST /api/client-errors` et finissent dans les mêmes journaux.

**Maintenance.** Chaque nuit à 3 h 30 : suppression des invités inactifs (`GUEST_RETENTION_DAYS`), des
parties abandonnées (`OPEN_SESSION_RETENTION_DAYS`) et des jetons e-mail périmés. Les comptes inscrits ne
sont jamais supprimés. À la demande : `POST /api/admin/maintenance/cleanup?dryRun=true`.

## Configuration de l'API (`apps/api/.env`)

| Variable | Défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | — | Connexion PostgreSQL |
| `JWT_SECRET` | — | Signature des sessions (32+ car. ; la valeur d'exemple est refusée en production) |
| `PORT` · `WEB_ORIGIN` · `APP_URL` | 4100 · :3100 · :3100 | Port, origine CORS, adresse des liens e-mail |
| `TRUST_PROXY` | `loopback` | Proxys autorisés à transmettre l'IP des joueurs (limitation de débit) |
| `LOG_LEVEL` | `info` | Niveau des journaux |
| `DAILY_TIMEZONE` | `Europe/Paris` | Minuit de l'énigme du jour et heure du nettoyage |
| `MAIL_TRANSPORT` · `SMTP_URL` · `MAIL_FROM` | `log` | `log` (boîte d'envoi locale) ou `smtp` |
| `GUEST_RETENTION_DAYS` · `OPEN_SESSION_RETENTION_DAYS` | 30 · 7 | Rétention avant nettoyage |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD` | — | Compte admin du seed (12 car. min. en production) |

## Déployer (Docker)

```bash
cp .env.production.example .env.production      # renseigner les secrets (jamais commité)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

La composition enchaîne `db` → `migrate` (migrations + seed, tâche ponctuelle) → `api` → `web` (port
`WEB_PORT`). Placer un proxy HTTPS (Caddy, Traefik, nginx…) devant le front : en production le cookie de
session est `Secure`. L'API n'est pas exposée hors du réseau Docker ; ne l'exposez pas directement avec
`TRUST_PROXY=loopback,uniquelocal`, sinon l'IP transmise pourrait être falsifiée.

## Intégration continue

`.github/workflows/ci.yml`, à chaque push sur `main` et chaque pull request :
1. types et tests unitaires ;
2. bout en bout sur une base Postgres neuve : migrations, seed, test de l'API, parcours Chrome
   (captures en artefact) ;
3. construction des images Docker.

## API (`/api`, relayée par le proxy de Next : même origine)

| Route | |
|---|---|
| `POST /auth/guest` · `register` · `login` · `logout` | Sessions |
| `GET` · `PATCH /auth/me` | Joueur courant (`{ me: null }` sans session) · pseudo |
| `POST /auth/email/verify` · `email/resend` | Vérification d'adresse |
| `POST /auth/password/forgot` · `password/reset` · `PATCH /auth/password` | Mot de passe |
| `GET /worlds` · `GET /worlds/:slug` | Mondes avec statut, étoiles, jardin · énigmes d'un monde |
| `GET /levels/:id` | Détail d'une énigme, sans les réponses |
| `POST /levels/:id/sessions` | Démarrer ou reprendre une partie (`{ restart: true }`) |
| `POST /sessions/:id/attempts` (`{ cells }`) · `/sessions/:id/hints` | Jouer un lien · indice suivant |
| `GET /daily` | Énigme du jour, résultat, série, résumé à partager |
| `GET /me/progress` · `GET /me/stats` | Progression par monde · statistiques par énigme |
| `GET /leaderboard?limit=20` | Classement (SQL) et rang du joueur |
| `/admin/worlds` · `/admin/levels` (+ `reorder`, `:id/duplicate`, `:id/stats`) | Éditeur (`ADMIN`) |
| `POST /admin/maintenance/cleanup` | Nettoyage à la demande |
| `POST /client-errors` · `GET /health` | Erreurs navigateur · santé (base comprise) |

## Étendre

- **Contenu** : via l'éditeur, ou dans `apps/api/prisma/seed.ts` pour les données initiales (le seed
  n'écrase jamais un monde existant). Règle : chaque lien doit être la *seule* réponse défendable d'après
  l'indice ; les fausses pistes des statistiques le vérifient en conditions réelles.
- **Règle de jeu** : `packages/shared/src/rules/` avec son test, puis l'API ; le front suit par les types.
- **Route** : type dans `shared/src/types.ts`, schéma dans `shared/src/schemas.ts`, module Nest dans
  `apps/api/src/`, fonction dans `apps/web/src/lib/api.ts`, hook dans `apps/web/src/lib/queries.ts`, et un
  cas dans `apps/api/scripts/smoke.mjs`.
