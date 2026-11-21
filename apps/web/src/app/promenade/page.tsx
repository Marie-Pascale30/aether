import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { PromenadeView } from "./PromenadeView";

export const metadata: Metadata = { title: "Promenade" };

export default function PromenadePage() {
    return (
        <RequirePlayer>
            <PromenadeView />
        </RequirePlayer>
    );
}
