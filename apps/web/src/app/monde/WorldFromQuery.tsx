"use client";

import { useSearchParams } from "next/navigation";
import { WorldView } from "./WorldView";

/** `/monde?m=<identifiant>` : une seule page, gardée pour le hors ligne. */
export function WorldFromQuery() {
    const slug = useSearchParams().get("m") ?? "";
    return <WorldView key={slug} slug={slug} />;
}
