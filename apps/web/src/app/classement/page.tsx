import { Redirect } from "@/components/shell/Redirect";

/** L'ancien classement a laissé place aux repères personnels. */
export default function LegacyLeaderboardPage() {
    return <Redirect to="/reperes" />;
}
