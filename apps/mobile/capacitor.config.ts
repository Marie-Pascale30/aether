import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Applications Android et iOS : une vue web qui sert l'export statique du site (`apps/web/out`,
 * construit par `npm run build:app -w @aether/web`) et parle à l'API distante (AETHER_API_URL).
 */
const apiUrl = process.env.AETHER_API_URL ?? "";
/** API en http (émulateur et API locale) : autorisée seulement dans ce cas, jamais en production. */
const insecureApi = apiUrl.startsWith("http://");

const NIGHT_BLUE = "#0b1626";

const config: CapacitorConfig = {
    // Identifiant unique de l'application dans les magasins : à fixer avant la première publication.
    appId: "fr.aether.atlas",
    appName: "AETHER",
    webDir: "../web/out",
    backgroundColor: NIGHT_BLUE,
    server: {
        // Android sert les pages depuis https://localhost (origine autorisée par l'API).
        androidScheme: "https",
        ...(insecureApi && { cleartext: true }),
    },
    android: {
        allowMixedContent: insecureApi,
    },
    plugins: {
        // Android 15+ dessine bord à bord : la vue web est décalée sous les barres système (« native »),
        // dont les icônes restent claires sur le bleu nuit.
        SystemBars: {
            insetsHandling: "native",
            initialViewportFitValueHint: "auto",
            style: "DARK",
        },
        SplashScreen: {
            launchShowDuration: 800,
            backgroundColor: NIGHT_BLUE,
            showSpinner: false,
        },
        StatusBar: {
            style: "DARK",
            backgroundColor: NIGHT_BLUE,
            overlaysWebView: false,
        },
    },
};

export default config;
