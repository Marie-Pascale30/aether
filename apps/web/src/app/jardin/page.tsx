import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { GardenIntro } from "./GardenIntro";

export const metadata: Metadata = { title: "Jardin des Origines" };

export default function GardenPage() {
    return (
        <RequirePlayer>
            <GardenIntro />
        </RequirePlayer>
    );
}
