import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { BookView } from "./BookView";

export const metadata: Metadata = { title: "Le Livre de l'Atlas" };

export default function BookPage() {
    return (
        <RequirePlayer>
            <BookView />
        </RequirePlayer>
    );
}
