import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { WorldsView } from "./WorldsView";

export const metadata: Metadata = { title: "Mondes" };

export default function WorldsPage() {
    return (
        <RequirePlayer>
            <WorldsView />
        </RequirePlayer>
    );
}
