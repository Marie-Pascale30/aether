import { LevelEditor } from "@/components/admin/LevelEditor";

export default async function NewLevelPage({ searchParams }: { searchParams: Promise<{ monde?: string }> }) {
    const { monde } = await searchParams;
    return <LevelEditor initialWorldId={monde} />;
}
