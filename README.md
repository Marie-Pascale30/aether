# AETHER

Jeu de puzzles contemplatif : chaque lien trouvé entre deux symboles restaure une partie du jardin.

Monorepo **npm workspaces** :

| Dossier | Rôle | Stack |
|---|---|---|
| `apps/web` | Le jeu (front) | Next.js 16 (App Router), React 19, TanStack Query, CSS Modules |
| `apps/api` | Règles, comptes, progression, classement, éditeur | NestJS 11, Prisma 6, PostgreSQL 17 |
| `packages/shared` | Contrat commun : types d'API, schémas Zod, règles de jeu pures | TypeScript, Zod 4, Vitest |
| `legacy/` | Ancienne version HTML/JS, conservée pour référence | — |

## Démarrer

Prérequis : Node 22+ et Docker.

```bash
npm install
cp apps/api/.env.example apps/api/.env    # puis remplace JWT_SECRET (32+ caractères aléatoires)
npm run setup                             # Postgres (Docker), build du paquet partagé, migrations, seed
npm run dev                               # shared (watch) + API :4100 + web :3100
```

Ouvre http://localhost:3100. L'éditeur de niveaux est sur `/admin/niveaux`, avec le compte
`ADMIN_EMAIL` / `ADMIN_PASSWORD` défini dans `apps/api/.env` (créé par le seed).

> Ports : 3100 (web), 4100 (API) et 5433 (Postgres) évitent les ports habituels 3000 / 4000 / 5432.
> Si Docker Hub est injoignable : `docker pull mirror.gcr.io/library/postgres:17-alpine` puis
> `docker tag mirror.gcr.io/library/postgres:17-alpine postgres:17-alpine`.

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Tout en mode développement |
| `npm run build` | Build de production (shared → api → web) |
| `npm run typecheck` | Vérification des types des trois workspaces |
| `npm test` | Tests unitaires des règles partagées |
| `npm run smoke -w @aether/api` | Test de bout en bout de l'API (serveur démarré) |
| `npm run e2e -w @aether/web` | Parcours complet dans Chrome/Edge (serveurs démarrés), captures dans `apps/web/e2e/.shots/` |
| `npm run db:up` / `db:down` | Démarrer / arrêter Postgres |
| `npm run db:migrate` | Créer / appliquer une migration après modification de `schema.prisma` |

## Comment ça marche

### Le serveur est l'arbitre
Le navigateur ne reçoit **jamais** les réponses (`pairs`). Le joueur ouvre une *partie*
(`PlaySession`), soumet des paires une à une, et l'API tient le compte : liens trouvés, erreurs,
indices révélés, temps écoulé. À la résolution, elle calcule les étoiles et met à jour le meilleur
résultat. Les mises à jour sont conditionnelles, ce qui neutralise les doubles clics et les onglets
concurrents.

### Règles (dans `packages/shared`, utilisées à l'identique des deux côtés)
- **Étoiles** : ★★★ sans erreur ni indice · ★★ avec ≤ 2 erreurs et ≤ 1 indice · ★ sinon.
- **Record** : plus d'étoiles, puis le temps le plus court.
- **Déblocage** : la 1ʳᵉ énigme est ouverte ; chaque énigme résolue ouvre la suivante. Une énigme
  résolue le reste, même si l'on en insère une avant elle.
- **Jardin** : 6 stades qui ne font que croître ; le dernier est réservé au parcours complet.
- **Validation d'une énigme** : chaque case d'une paire existe et n'appartient qu'à une seule paire.

### Comptes
On joue tout de suite **en invité** (session par cookie httpOnly). Créer un compte transforme ce
même invité en compte complet, sans rien perdre. Se connecter depuis une session invité **fusionne**
la progression (meilleur résultat par énigme). Les invités n'apparaissent pas au classement.

### API (`/api`, relayée par le proxy de Next : même origine, pas de CORS côté navigateur)

| Route | |
|---|---|
| `POST /auth/guest` · `/auth/register` · `/auth/login` · `/auth/logout` | Sessions |
| `GET` · `PATCH /auth/me` | Joueur courant (`{ me: null }` sans session) · changer de pseudo |
| `GET /levels` · `GET /levels/:id` | Parcours avec statut et records · détail sans les réponses |
| `POST /levels/:id/sessions` | Démarrer ou reprendre une partie (`{ restart: true }` pour recommencer) |
| `POST /sessions/:id/attempts` · `/sessions/:id/hints` | Soumettre une paire · révéler l'indice suivant |
| `GET /me/progress` · `GET /me/stats` | Jardin et étoiles · statistiques par énigme |
| `GET /leaderboard?limit=20` | Classement (calculé en SQL) et rang du joueur |
| `/admin/levels` (CRUD) · `POST /admin/levels/reorder` | Éditeur, réservé au rôle `ADMIN` |
| `GET /health` | Santé (base comprise) |

Les limites de débit sont plus strictes sur les routes d'authentification (10 requêtes par minute).

## Étendre

- **Nouvelle énigme** : via l'éditeur `/admin/niveaux` (brouillon → test → publication), ou dans
  `apps/api/prisma/seed.ts` pour les données initiales.
- **Nouvelle règle de jeu** : l'écrire dans `packages/shared/src/rules/` avec son test, puis l'utiliser
  dans l'API ; le front en profite via les types.
- **Nouvelle route** : type de réponse dans `shared/src/types.ts`, schéma d'entrée dans
  `shared/src/schemas.ts`, module Nest dans `apps/api/src/`, fonction dans `apps/web/src/lib/api.ts`
  et hook dans `apps/web/src/lib/queries.ts`.
