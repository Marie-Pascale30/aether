"use client";

import { useSearchParams } from "next/navigation";
import { LevelView } from "@/components/puzzle/LevelView";

/** `/enigme?id=<énigme>` : une seule page, gardée pour le hors ligne. */
export function LevelFromQuery() {
    const id = useSearchParams().get("id") ?? "";
    // `key` : passer à l'énigme suivante repart d'un état de partie vierge.
    return <LevelView key={id} levelId={id} />;
}
