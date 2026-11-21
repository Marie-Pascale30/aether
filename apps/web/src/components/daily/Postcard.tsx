"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { drawPostcard, type PostcardInput } from "@/lib/postcard";
import styles from "./Postcard.module.css";

/**
 * La carte postale du jour : une image (ciel du moment, fleur d'harmonie, série) à partager ou à
 * garder. Dessinée sur l'appareil, sans réseau.
 */
export function Postcard(input: PostcardInput) {
    const { date, petals, streak, region } = input;
    const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    useEffect(() => {
        let url: string | null = null;
        let cancelled = false;
        drawPostcard({ date, petals, streak, region })
            .then((blob) => {
                if (cancelled) return;
                url = URL.createObjectURL(blob);
                setCard({ blob, url });
            })
            .catch(() => setCard(null));
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [date, petals, streak, region]);

    if (!card) return null;
    const name = `aether-${date}.png`;

    async function share() {
        if (!card) return;
        const file = new File([card.blob], name, { type: "image/png" });
        try {
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: "AETHER · énigme du jour" });
                return;
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
        }
        // Pas de partage de fichiers : on enregistre l'image.
        const link = document.createElement("a");
        link.href = card.url;
        link.download = name;
        link.click();
        setFeedback("Carte enregistrée ✓");
        setTimeout(() => setFeedback(null), 2500);
    }

    return (
        <figure className={styles.postcard}>
            <img src={card.url} alt="Carte postale du jour : la fleur d'harmonie sous le ciel du moment" className={styles.image} />
            <figcaption className={styles.caption}>
                <Button onClick={share} aria-live="polite">
                    {feedback ?? "Envoyer la carte postale"}
                </Button>
            </figcaption>
        </figure>
    );
}
