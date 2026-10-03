"use client";

import { LocalPuzzleView } from "@/components/mechanics/LocalPuzzleView";
import { ErrorState, Loading } from "@/components/ui/States";
import { useLevel } from "@/lib/queries";
import { PuzzleView } from "./PuzzleView";

/**
 * Aiguillage selon la mécanique : les Liens ouvrent une partie validée par le serveur,
 * les autres mécaniques se jouent entièrement sur l'appareil.
 */
export function LevelView({ levelId }: { levelId: string }) {
    const level = useLevel(levelId);

    if (level.error) return <ErrorState error={level.error} onRetry={() => void level.refetch()} />;
    if (!level.data) return <Loading label="L'énigme se dessine…" />;
    if (level.data.mechanic === "LINKS") return <PuzzleView levelId={levelId} />;
    return <LocalPuzzleView detail={level.data} />;
}
