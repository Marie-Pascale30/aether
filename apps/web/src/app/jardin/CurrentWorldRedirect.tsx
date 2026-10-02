"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState, Loading } from "@/components/ui/States";
import { useProgress } from "@/lib/queries";

export function CurrentWorldRedirect() {
    const router = useRouter();
    const progress = useProgress();

    useEffect(() => {
        if (!progress.data) return;
        // Tout est restauré : on retrouve le dernier monde ; sinon, celui en cours.
        const slug = progress.data.resume?.world.slug ?? progress.data.worlds.at(-1)?.slug;
        router.replace(slug ? `/mondes/${slug}` : "/mondes");
    }, [progress.data, router]);

    if (progress.error) return <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />;
    return <Loading />;
}
