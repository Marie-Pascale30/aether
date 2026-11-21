import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui/States";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<Loading />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
