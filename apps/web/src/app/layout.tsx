import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { OfflineStatus } from "@/components/shell/OfflineStatus";
import { Providers } from "./providers";
import "./globals.css";
import styles from "./layout.module.css";

/**
 * Polices embarquées avec le site (aucune requête vers Google, disponibles hors ligne et dans les
 * applications) : un serif élégant pour les titres, un sans-serif très lisible pour le texte.
 */
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display", display: "swap" });
const text = Source_Sans_3({ subsets: ["latin"], variable: "--font-text", display: "swap" });

/** Lit les réglages de l'appareil et pose data-theme / data-motion avant que React ne démarre. */
const EARLY_SETTINGS = `try{var s=JSON.parse(localStorage.getItem("aether:settings")||"{}"),r=document.documentElement,t=s.theme||"nuit";if(t==="systeme")t=matchMedia("(prefers-color-scheme: light)").matches?"ivoire":"nuit";r.dataset.theme=t;if(s.motion)r.dataset.motion=s.motion}catch(e){}`;

export const metadata: Metadata = {
    title: { default: "AETHER", template: "%s · AETHER" },
    description: "Offrez à votre esprit un moment de plaisir : des énigmes paisibles qui restaurent l'Atlas des Esprits.",
    applicationName: "AETHER",
    appleWebApp: { capable: true, title: "AETHER", statusBarStyle: "black-translucent" },
    icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
    themeColor: "#0b1626",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="fr" className={`${display.variable} ${text.variable}`} suppressHydrationWarning>
            <body>
                {/* Apparence et animations appliquées avant le premier affichage (pas d'éclair de couleur). */}
                <script dangerouslySetInnerHTML={{ __html: EARLY_SETTINGS }} />
                <Providers>
                    <a href="#contenu" className="skip-link">
                        Aller au contenu
                    </a>
                    <div className={styles.app}>
                        <AppHeader />
                        <OfflineStatus />
                        <main id="contenu" tabIndex={-1} className={styles.main}>
                            {children}
                        </main>
                        <footer className={styles.footer}>L&apos;Atlas des Esprits · Prototype 0.5</footer>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
