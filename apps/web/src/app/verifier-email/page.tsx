import type { Metadata } from "next";
import { VerifyEmail } from "./VerifyEmail";

export const metadata: Metadata = { title: "Confirmation d'adresse" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token } = await searchParams;
    return <VerifyEmail token={token ?? ""} />;
}
