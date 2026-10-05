import { permanentRedirect } from "next/navigation";
import { levelHref } from "@/lib/routes";

/** Ancienne adresse d'une énigme. */
export default async function LegacyPuzzlePage({ params }: { params: Promise<{ id: string }> }) {
    permanentRedirect(levelHref((await params).id));
}
