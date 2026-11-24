import type { ReactNode } from "react";
import { Panel } from "@/components/ui/Panel";
import styles from "./Legal.module.css";

/** Éditrice du site et contact pour toute question sur les données personnelles. */
export const PUBLISHER = {
    name: "Marie Pascale Bogne Sonkeng",
    email: "bognesonkeng.mp@gmail.com",
} as const;

/** Date de dernière mise à jour des pages légales (à changer à chaque modification). */
export const LEGAL_UPDATED_AT = "24 novembre 2026";

export function LegalPage({ tag, title, children }: { tag: string; title: string; children: ReactNode }) {
    return (
        <Panel className={styles.page}>
            <div className="tag">{tag}</div>
            <h2>{title}</h2>
            <p className={styles.updated}>Dernière mise à jour : {LEGAL_UPDATED_AT}</p>
            <div className={styles.body}>{children}</div>
        </Panel>
    );
}

export function MailTo() {
    return <a href={`mailto:${PUBLISHER.email}`}>{PUBLISHER.email}</a>;
}
