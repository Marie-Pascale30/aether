"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Partage natif (mobile) quand il existe, sinon copie dans le presse-papiers. */
export function ShareButton({ text, variant = "default" }: { text: string; variant?: "default" | "primary" }) {
    const [feedback, setFeedback] = useState<string | null>(null);

    async function share() {
        try {
            if (navigator.share) {
                await navigator.share({ text });
                return;
            }
            await navigator.clipboard.writeText(text);
            setFeedback("Copié ✓");
        } catch (error) {
            // Partage annulé par le joueur : rien à signaler.
            if (error instanceof DOMException && error.name === "AbortError") return;
            setFeedback("Copie impossible : sélectionne le texte à la main.");
        }
        setTimeout(() => setFeedback(null), 2500);
    }

    return (
        <Button variant={variant} onClick={share} aria-live="polite">
            {feedback ?? "Partager mon résultat"}
        </Button>
    );
}
