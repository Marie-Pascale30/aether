"use client";

import { Garden } from "@/components/garden/Garden";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Loading } from "@/components/ui/States";
import { useGrowingStage } from "@/hooks/useGrowingStage";
import { useMe, useProgress } from "@/lib/queries";
import styles from "./fin.module.css";

export function Ending() {
    const { data: me } = useMe();
    const { data: progress } = useProgress();
    // Le jardin du dernier monde, celui qui vient de s'épanouir.
    const lastWorld = progress?.worlds.at(-1);
    const garden = useGrowingStage(lastWorld?.garden.stage, lastWorld?.slug ?? "fin");

    if (!progress) return <Loading />;

    const { completedLevels, totalLevels } = progress;
    const finished = totalLevels > 0 && completedLevels === totalLevels;

    if (!finished) {
        return (
            <Panel className={styles.story}>
                <div className="tag">Pas encore</div>
                <p>
                    Le monde attend encore {totalLevels - completedLevels} énigme{totalLevels - completedLevels > 1 ? "s" : ""}{" "}
                    avant de se souvenir de lui-même.
                </p>
                <ButtonLink href="/jardin" variant="primary">
                    Reprendre les énigmes
                </ButtonLink>
            </Panel>
        );
    }

    return (
        <Panel className={styles.story}>
            <div className="tag">Première restauration</div>
            <blockquote className={styles.quote}>
                « Le jardin ne s&apos;est pas agrandi.
                <br />
                Il s&apos;est souvenu de lui-même. »
            </blockquote>
            <Garden stage={garden.stage} instant={garden.instant} theme={lastWorld?.theme} className={styles.garden} />
            <p>
                Tu viens de terminer la première boucle d&apos;AETHER : observer, comprendre, relier, restaurer.
                <br />
                {progress.totalStars} étoiles sur {progress.maxStars}
                {progress.totalStars < progress.maxStars && " — certaines énigmes peuvent encore briller davantage."}
            </p>

            {me?.isGuest && (
                <p className={styles.invite}>
                    Crée un compte pour inscrire ton nom au classement : ta progression est conservée.
                </p>
            )}

            <div className="row" style={{ justifyContent: "center" }}>
                <ButtonLink href="/jardin" variant="primary">
                    Revenir au jardin
                </ButtonLink>
                {me?.isGuest ? (
                    <ButtonLink href="/inscription">Créer un compte</ButtonLink>
                ) : (
                    <ButtonLink href="/classement">Voir le classement</ButtonLink>
                )}
            </div>
        </Panel>
    );
}
