/*
 * Service worker d'AETHER : garde les pages et leurs fichiers pour rouvrir le jeu sans réseau.
 * Les données (contenu, progression) ne passent pas par ici : l'application les garde elle-même
 * (cache de requêtes persistant et file des victoires). /api n'est jamais intercepté.
 *
 * La version (`?v=` à l'enregistrement) change à chaque construction : l'installation de la
 * nouvelle version remplace les caches de l'ancienne.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const PAGES = `aether-pages-${VERSION}`;
const ASSETS = `aether-assets-${VERSION}`;

/** Pages fixes du jeu (les mondes et énigmes passent par un paramètre : une seule page chacune). */
const SHELL = ["/", "/jardin", "/mondes", "/monde", "/enigme", "/quotidien", "/reperes", "/profil", "/reglages"];

const STATIC_URL = /\/_next\/static\/[^"'\s)\\]+/g;

async function precache() {
    const pages = await caches.open(PAGES);
    const assets = await caches.open(ASSETS);
    const found = new Set(["/icon.svg", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);

    await Promise.all(
        SHELL.map(async (path) => {
            const response = await fetch(path, { credentials: "same-origin" });
            if (!response.ok) return;
            const html = await response.clone().text();
            for (const match of html.matchAll(STATIC_URL)) found.add(match[0]);
            await pages.put(path, response);
        }),
    );
    // Un fichier manquant ne doit pas faire échouer toute l'installation.
    await Promise.all([...found].map((url) => assets.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
    event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) => Promise.all(names.filter((name) => name.startsWith("aether-") && name !== PAGES && name !== ASSETS).map((name) => caches.delete(name))))
            .then(() => self.clients.claim()),
    );
});

/** Pages : réseau d'abord (contenu frais), copie gardée sinon — quel que soit le paramètre. */
async function page(request) {
    const url = new URL(request.url);
    const cache = await caches.open(PAGES);
    try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") await cache.put(url.pathname, response.clone());
        return response;
    } catch {
        return (await cache.match(url.pathname)) || (await cache.match("/")) || Response.error();
    }
}

/** Fichiers de construction (noms uniques) : la copie gardée suffit. */
async function asset(request) {
    const cache = await caches.open(ASSETS);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
}

/** Autres fichiers (icônes, manifeste) : copie gardée tout de suite, rafraîchie en arrière-plan. */
async function staleWhileRevalidate(request, event) {
    const cache = await caches.open(ASSETS);
    const cached = await cache.match(request);
    const refresh = fetch(request)
        .then((response) => {
            if (response.ok) void cache.put(request, response.clone());
            return response;
        })
        .catch(() => cached || Response.error());
    if (cached) {
        event.waitUntil(refresh);
        return cached;
    }
    return refresh;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(page(request));
    } else if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
        // Navigation interne de Next : sans réseau, elle échoue et Next recharge la page entière,
        // que l'on sert alors depuis le cache.
        return;
    } else if (url.pathname.startsWith("/_next/static/")) {
        event.respondWith(asset(request));
    } else {
        event.respondWith(staleWhileRevalidate(request, event));
    }
});
