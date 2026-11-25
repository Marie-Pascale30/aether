import path from "node:path";
import type { NextConfig } from "next";

/** Adresse de l'API NestJS, vue depuis le serveur Next (jamais exposée au navigateur). */
const API_URL = process.env.API_URL ?? "http://localhost:4100";

/**
 * Export statique pour les applications (Capacitor, Tauri) : des fichiers seulement, sans serveur
 * Next. Les pages sont en dossiers (`monde/index.html`), que les vues web des applis servent telles quelles.
 */
const EXPORT = process.env.NEXT_EXPORT === "1";
const DEV = process.env.NODE_ENV !== "production";

/**
 * Politique de sécurité du contenu. Les pages sont pré-rendues (statiques) : pas de nonce possible,
 * d'où 'unsafe-inline' pour les scripts en ligne de Next (données de navigation) et le script qui
 * applique le thème avant l'affichage. Tout le reste est fermé : aucune origine tierce (polices
 * embarquées, API relayée sur la même origine), pas de cadre, pas de plugin.
 */
const CSP = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${DEV ? " ws:" : ""}`,
    "media-src 'self' data: blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(DEV ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const SECURITY_HEADERS = [
    { key: "Content-Security-Policy", value: CSP },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
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
    // reste first-party et il n'y a pas de CORS à gérer côté client. (Sans objet à l'export :
    // l'application de bureau a sa propre CSP, dans apps/desktop/src-tauri/tauri.conf.json.)
    ...(!EXPORT && {
        async rewrites() {
            return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
        },
        async headers() {
            // /api est relayée telle quelle : l'API pose ses propres en-têtes (helmet).
            return [{ source: "/:path((?!api/).*)", headers: SECURITY_HEADERS }];
        },
    }),
};

export default nextConfig;
