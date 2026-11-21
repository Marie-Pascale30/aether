import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { HerbariumView } from "./HerbariumView";

export const metadata: Metadata = { title: "Herbier" };

export default function HerbariumPage() {
    return (
        <RequirePlayer>
            <HerbariumView />
        </RequirePlayer>
    );
}
