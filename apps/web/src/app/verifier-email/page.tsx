import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/States";
import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = { title: "Confirmation d'adresse" };

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<Loading />}>
            <VerifyEmail />
        </Suspense>
    );
}
