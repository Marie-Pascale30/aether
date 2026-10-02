import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={[styles.panel, className].filter(Boolean).join(" ")} {...props} />;
}

/** Encadré « Principe : … » / « Indice : … ». */
export function Callout({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className={styles.callout}>
            <b>{label}</b> {children}
        </div>
    );
}
