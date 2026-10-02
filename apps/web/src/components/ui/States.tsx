import { ApiError } from "@/lib/api";
import { Button, ButtonLink } from "./Button";
import { Panel } from "./Panel";
import styles from "./ui.module.css";

export function Loading({ label = "Le jardin s'éveille…" }: { label?: string }) {
    return (
        <div className={styles.loading} role="status">
            <span className={styles.loadingGlyph} aria-hidden>✦</span>
            {label}
        </div>
    );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    const status = error instanceof ApiError ? error.status : 0;
    const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
    const title = status === 403 ? "Passage scellé" : status === 404 ? "Rien ici" : "Un souffle a manqué";

    return (
        <Panel className={styles.errorState}>
            <div className="tag">{title}</div>
            <p>{message}</p>
            <div className="row" style={{ justifyContent: "center" }}>
                {onRetry && status >= 500 && <Button onClick={onRetry}>Réessayer</Button>}
                <ButtonLink href="/mondes" variant="primary">Retour aux mondes</ButtonLink>
            </div>
        </Panel>
    );
}
