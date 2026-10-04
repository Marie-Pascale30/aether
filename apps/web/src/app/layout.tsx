import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { OfflineStatus } from "@/components/shell/OfflineStatus";
import { Providers } from "./providers";
import "./globals.css";
import styles from "./layout.module.css";

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
        <html lang="fr">
            <body>
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
                        <footer className={styles.footer}>L&apos;Atlas des Esprits · Prototype 0.4</footer>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
