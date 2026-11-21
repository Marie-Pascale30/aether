"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LevelEditor } from "@/components/admin/LevelEditor";
import { LevelStatsPanel } from "@/components/admin/LevelStatsPanel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useAdminLevel } from "@/lib/queries";

function EditLevel() {
    const id = useSearchParams().get("id") ?? "";
    const level = useAdminLevel(id);

    if (level.error) return <ErrorState error={level.error} />;
    if (!level.data) return <Loading />;
    return (
        <div className="stack">
            <LevelEditor key={level.data.id} level={level.data} />
            <LevelStatsPanel levelId={level.data.id} kind={level.data.kind} />
        </div>
    );
}

/** `/admin/niveaux/edition?id=…` : une page fixe (compatible avec l'export statique des applis). */
export default function EditLevelPage() {
    return (
        <Suspense fallback={<Loading />}>
            <EditLevel />
        </Suspense>
    );
}
