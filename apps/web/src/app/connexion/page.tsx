import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
    return (
        <Suspense>
            <AuthForm mode="login" />
        </Suspense>
    );
}
