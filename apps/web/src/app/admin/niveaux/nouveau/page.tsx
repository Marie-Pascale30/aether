"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LevelEditor } from "@/components/admin/LevelEditor";
import { Loading } from "@/components/ui/States";

function NewLevel() {
    const monde = useSearchParams().get("monde") ?? undefined;
    return <LevelEditor initialWorldId={monde} />;
}

export default function NewLevelPage() {
    return (
        <Suspense fallback={<Loading />}>
            <NewLevel />
        </Suspense>
    );
}
