import type { NextConfig } from "next";

/** Adresse de l'API NestJS, vue depuis le serveur Next (jamais exposée au navigateur). */
const API_URL = process.env.API_URL ?? "http://localhost:4100";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    // Le navigateur parle uniquement à /api sur la même origine : le cookie de session
    // reste first-party et il n'y a pas de CORS à gérer côté client.
    async rewrites() {
        return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
    },
};

export default nextConfig;
