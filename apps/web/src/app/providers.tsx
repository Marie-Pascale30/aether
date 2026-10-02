"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SettingsProvider } from "@/lib/settings";
import { SoundProvider } from "@/lib/sound/SoundProvider";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>
                <SoundProvider>{children}</SoundProvider>
            </SettingsProvider>
        </QueryClientProvider>
    );
}
