import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/AppHeader";
import { Providers } from "./providers";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
    title: { default: "AETHER", template: "%s · AETHER" },
    description: "Une expérience contemplative de puzzles où chaque connexion restaure une partie du monde.",
};

export const viewport: Viewport = {
    themeColor: "#07131b",
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
                        <main id="contenu" tabIndex={-1} className={styles.main}>
                            {children}
                        </main>
                        <footer className={styles.footer}>Jardin des Origines · Prototype 0.2</footer>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
