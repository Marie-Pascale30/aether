"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState, Loading } from "@/components/ui/States";
import { usePlayer } from "@/lib/offline/player";
import { worldHref } from "@/lib/routes";

export function CurrentWorldRedirect() {
    const router = useRouter();
    const player = usePlayer();
    const summary = player.data?.journey.summary;

    useEffect(() => {
        if (!summary) return;
        // Tout est restauré : on retrouve le dernier monde ; sinon, celui en cours.
        const slug = summary.resume?.world.slug ?? summary.worlds.at(-1)?.slug;
        router.replace(slug ? worldHref(slug) : "/mondes");
    }, [summary, router]);

    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    return <Loading />;
}
