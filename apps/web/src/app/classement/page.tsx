import { permanentRedirect } from "next/navigation";

/** L'ancien classement a laissé place aux repères personnels. */
export default function LegacyLeaderboardPage() {
    permanentRedirect("/reperes");
}
