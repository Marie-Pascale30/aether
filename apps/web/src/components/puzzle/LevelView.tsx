"use client";

import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { usePlayer } from "@/lib/offline/player";
import { useLevel, useMe } from "@/lib/queries";
import { worldHref } from "@/lib/routes";
import { PuzzleView } from "./PuzzleView";

/**
 * Une énigme du contenu embarqué se joue tout de suite, même hors ligne. Sinon (brouillon vu
 * par un administrateur, énigme du jour pas encore embarquée), on la demande au serveur.
 */
export function LevelView({ levelId }: { levelId: string }) {
    const player = usePlayer();
    const { data: me } = useMe();
    const local = player.data?.journey.level(levelId) ?? null;
    const status = player.data?.journey.status(levelId) ?? null;
    const remote = useLevel(levelId, Boolean(player.data) && !local);

    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    if (!player.data) return <Loading label="L'énigme se dessine…" />;

    // Un administrateur peut tout essayer (aperçu depuis l'éditeur).
    if (local && status === "locked" && me?.role !== "ADMIN") {
        return (
            <Panel style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
                <div className="tag">Scellée</div>
                <h2>{local.title}</h2>
                <p style={{ marginInline: "auto" }}>Cette énigme s&apos;ouvrira quand tu auras résolu celles qui la précèdent.</p>
                <ButtonLink href={worldHref(local.world.slug)} variant="primary">
                    {local.world.title}
                </ButtonLink>
            </Panel>
        );
    }

    const detail = local ?? remote.data;
    if (!detail) {
        if (remote.error) return <ErrorState error={remote.error} onRetry={() => void remote.refetch()} />;
        return <Loading label="L'énigme se dessine…" />;
    }
    return <PuzzleView key={detail.id} detail={detail} />;
}
