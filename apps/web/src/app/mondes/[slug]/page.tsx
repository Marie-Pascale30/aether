import { permanentRedirect } from "next/navigation";
import { worldHref } from "@/lib/routes";

/** Ancienne adresse d'un monde. */
export default async function LegacyWorldPage({ params }: { params: Promise<{ slug: string }> }) {
    permanentRedirect(worldHref((await params).slug));
}
