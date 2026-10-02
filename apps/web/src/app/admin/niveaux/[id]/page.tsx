"use client";

import { useParams } from "next/navigation";
import { LevelEditor } from "@/components/admin/LevelEditor";
import { ErrorState, Loading } from "@/components/ui/States";
import { useAdminLevel } from "@/lib/queries";

export default function EditLevelPage() {
    const { id } = useParams<{ id: string }>();
    const level = useAdminLevel(id);

    if (level.error) return <ErrorState error={level.error} />;
    if (!level.data) return <Loading />;
    return <LevelEditor key={level.data.id} level={level.data} />;
}
