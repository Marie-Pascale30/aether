import type { Metadata } from "next";
import { LeaderboardView } from "./LeaderboardView";

export const metadata: Metadata = { title: "Classement" };

export default function LeaderboardPage() {
    return <LeaderboardView />;
}
