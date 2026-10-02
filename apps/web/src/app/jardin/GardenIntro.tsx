"use client";

import { Garden } from "@/components/garden/Garden";
import { ButtonLink } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { useGrowingStage } from "@/hooks/useGrowingStage";
import { useProgress } from "@/lib/queries";
import styles from "./jardin.module.css";

export function GardenIntro() {
    const { data: progress } = useProgress();
    const garden = useGrowingStage(progress?.garden.stage);

    const completed = progress?.garden.completedLevels ?? 0;
    const total = progress?.garden.totalLevels ?? 0;
    const allDone = total > 0 && completed === total;
    const cta = progress?.nextLevelId
        ? { href: `/niveaux/${progress.nextLevelId}`, label: completed > 0 ? "Continuer la restauration" : "Entrer dans le jardin" }
        : { href: allDone ? "/fin" : "/niveaux", label: allDone ? "Revoir la fin" : "Voir les énigmes" };

    return (
        <Panel>
            <div className={styles.intro}>
                <div>
                    <div className="tag">Jardin des Origines</div>
                    <h2>Les Liens</h2>
                    <p>
                        Dans AETHER, les choses ne sont pas seulement placées les unes à côté des autres. Elles se
                        répondent.
                    </p>
                    <Callout label="Principe :">
                        trouve les symboles qui partagent la même relation, puis relie-les. Chaque énigme résolue fait
                        pousser le jardin.
                    </Callout>
                    {total > 0 && (
                        <p className={styles.count}>
                            {completed} / {total} énigmes restaurées · {progress?.totalStars ?? 0} / {progress?.maxStars ?? 0} ★
                        </p>
                    )}
                    <div className="row">
                        <ButtonLink href={cta.href} variant="primary">
                            {cta.label}
                        </ButtonLink>
                        {completed > 0 && (
                            <ButtonLink href="/niveaux" variant="ghost">
                                Carte des énigmes
                            </ButtonLink>
                        )}
                    </div>
                </div>
                <Garden stage={garden.stage} instant={garden.instant} />
            </div>
        </Panel>
    );
}
