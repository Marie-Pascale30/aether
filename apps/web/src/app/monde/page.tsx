import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirePlayer } from "@/components/shell/RequirePlayer";
import { Loading } from "@/components/ui/States";
import { WorldFromQuery } from "./WorldFromQuery";

export const metadata: Metadata = { title: "Monde" };

export default function WorldPage() {
    return (
        <RequirePlayer>
            <Suspense fallback={<Loading />}>
                <WorldFromQuery />
            </Suspense>
        </RequirePlayer>
    );
}
