import path from "node:path";
import type { NextConfig } from "next";

/** Adresse de l'API NestJS, vue depuis le serveur Next (jamais exposée au navigateur). */
const API_URL = process.env.API_URL ?? "http://localhost:4100";

/**
 * Export statique pour les applications (Capacitor, Tauri) : des fichiers seulement, sans serveur
 * Next. Les pages sont en dossiers (`monde/index.html`), que les vues web des applis servent telles quelles.
 */
const EXPORT = process.env.NEXT_EXPORT === "1";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Version de la construction : renouvelle le service worker (et ses caches) à chaque déploiement.
    env: { NEXT_PUBLIC_BUILD_ID: process.env.BUILD_ID ?? Date.now().toString(36) },
    // Image Docker : serveur autonome qui n'embarque que les fichiers utiles. La racine de traçage
    // est celle du monorepo, pour inclure le paquet partagé.
    ...(process.env.NEXT_STANDALONE === "1" && {
        output: "standalone",
        outputFileTracingRoot: path.join(process.cwd(), "../.."),
    }),
    ...(EXPORT && { output: "export", trailingSlash: true }),
    // Le navigateur parle uniquement à /api sur la même origine : le cookie de session
    // reste first-party et il n'y a pas de CORS à gérer côté client. (Sans objet à l'export.)
    ...(!EXPORT && {
        async rewrites() {
            return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
        },
    }),
};

export default nextConfig;
