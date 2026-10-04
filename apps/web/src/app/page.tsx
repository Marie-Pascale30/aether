"use client";

import { ButtonLink } from "@/components/ui/Button";
import { usePlayer } from "@/lib/offline/player";
import { useMe } from "@/lib/queries";
import { levelHref } from "@/lib/routes";
import styles from "./home.module.css";

export default function HomePage() {
    const { data: me } = useMe();
    const progress = usePlayer().data?.journey.summary;
    const hasStarted = (progress?.completedLevels ?? 0) > 0;
    const resumeHref = progress?.resume?.levelId ? levelHref(progress.resume.levelId) : "/jardin";

    return (
        <section className={styles.hero}>
            <div className={styles.symbol} aria-hidden />
            <div className="tag">Offrez à votre esprit un moment de plaisir</div>
            <h1>AETHER</h1>
            <p>
                L&apos;Atlas des Esprits, grande bibliothèque vivante, s&apos;est brisé en fragments. Énigme après énigme,
                à ton rythme, rends-lui sa mémoire : sept régions, sept façons de penser.
            </p>

            <div className="row" style={{ justifyContent: "center" }}>
                {hasStarted ? (
                    <ButtonLink href={resumeHref} variant="primary">
                        Reprendre
                    </ButtonLink>
                ) : (
                    <ButtonLink href="/jardin" variant="primary">
                        Commencer
                    </ButtonLink>
                )}
                {!me && (
                    <ButtonLink href="/connexion" variant="ghost">
                        J&apos;ai déjà un compte
                    </ButtonLink>
                )}
            </div>
            <div className={styles.footer}>Observation · Mémoire · Logique · Vision · Rythme · Associations · Sagesse</div>
        </section>
    );
}
