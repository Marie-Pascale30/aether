import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { Ending } from "./Ending";

export const metadata: Metadata = { title: "Première restauration" };

export default function EndPage() {
    return (
        <RequirePlayer>
            <Ending />
        </RequirePlayer>
    );
}
