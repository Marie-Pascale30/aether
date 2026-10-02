import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { CurrentWorldRedirect } from "./CurrentWorldRedirect";

export const metadata: Metadata = { title: "Jardin" };

/** « Mon jardin » : celui du monde en cours de restauration. */
export default function GardenPage() {
    return (
        <RequirePlayer>
            <CurrentWorldRedirect />
        </RequirePlayer>
    );
}
