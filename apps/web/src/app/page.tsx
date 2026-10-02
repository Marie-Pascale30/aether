"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useMe, useProgress } from "@/lib/queries";
import styles from "./home.module.css";

export default function HomePage() {
    const { data: me } = useMe();
    const { data: progress } = useProgress(Boolean(me));
    const hasStarted = (progress?.garden.completedLevels ?? 0) > 0;

    return (
        <section className={styles.hero}>
            <div className={styles.symbol} aria-hidden />
            <div className="tag">Un monde attend ses connexions</div>
            <h1>AETHER</h1>
            <p>Une expérience contemplative de puzzles où chaque connexion restaure une partie du monde.</p>

            <div className="row" style={{ justifyContent: "center" }}>
                {hasStarted ? (
                    <ButtonLink href="/niveaux" variant="primary">
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
            <div className={styles.footer}>Jardin des Origines</div>
        </section>
    );
}
