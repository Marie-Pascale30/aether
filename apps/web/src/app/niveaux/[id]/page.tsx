import type { Metadata } from "next";
import { LevelView } from "@/components/puzzle/LevelView";
import { RequirePlayer } from "@/components/shell/RequirePlayer";

export const metadata: Metadata = { title: "Énigme" };

export default async function PuzzlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <RequirePlayer>
            {/* `key` : passer à l'énigme suivante repart d'un état de partie vierge. */}
            <LevelView key={id} levelId={id} />
        </RequirePlayer>
    );
}
