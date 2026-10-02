import type { Metadata } from "next";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { WorldView } from "./WorldView";

export const metadata: Metadata = { title: "Monde" };

export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return (
        <RequirePlayer>
            <WorldView key={slug} slug={slug} />
        </RequirePlayer>
    );
}
