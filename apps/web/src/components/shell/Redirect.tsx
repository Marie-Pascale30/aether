"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui/States";

/** Redirection faite dans le navigateur : une page statique (applis, export) ne peut pas répondre 30x. */
export function Redirect({ to }: { to: string }) {
    const router = useRouter();
    useEffect(() => router.replace(to), [router, to]);
    return <Loading />;
}
