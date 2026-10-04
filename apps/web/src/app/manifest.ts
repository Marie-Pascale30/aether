import type { MetadataRoute } from "next";

/** Application installable (écran d'accueil, bureau) : s'ouvre sur le jardin en cours. */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "AETHER",
        short_name: "AETHER",
        description: "Offrez à votre esprit un moment de plaisir : des énigmes paisibles qui restaurent un monde.",
        lang: "fr",
        start_url: "/jardin",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#0b1626",
        theme_color: "#0b1626",
        categories: ["games", "puzzle", "education"],
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
