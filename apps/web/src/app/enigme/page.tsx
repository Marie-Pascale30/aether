import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { Loading } from "@/components/ui/States";
import { LevelFromQuery } from "./LevelFromQuery";

export const metadata: Metadata = { title: "Énigme" };

export default function PuzzlePage() {
    return (
        <RequirePlayer>
            <Suspense fallback={<Loading label="L'énigme se dessine…" />}>
                <LevelFromQuery />
            </Suspense>
        </RequirePlayer>
    );
}
