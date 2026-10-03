import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { MilestonesView } from "./MilestonesView";

export const metadata: Metadata = { title: "Repères" };

export default function MilestonesPage() {
    return (
        <RequirePlayer>
            <MilestonesView />
        </RequirePlayer>
    );
}
