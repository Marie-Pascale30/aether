import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
    return (
        <RequirePlayer>
            <ProfileView />
        </RequirePlayer>
    );
}
