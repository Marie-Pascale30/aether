import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { DailyView } from "./DailyView";

export const metadata: Metadata = { title: "Énigme du jour" };

export default function DailyPage() {
    return (
        <RequirePlayer>
            <DailyView />
        </RequirePlayer>
    );
}
