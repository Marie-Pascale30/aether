import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { LevelMap } from "./LevelMap";

export const metadata: Metadata = { title: "Énigmes" };

export default function LevelsPage() {
    return (
        <RequirePlayer>
            <LevelMap />
        </RequirePlayer>
    );
}
