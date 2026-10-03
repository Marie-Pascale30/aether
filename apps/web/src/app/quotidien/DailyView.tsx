"use client";

import { ShareButton } from "@/components/daily/ShareButton";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Harmony } from "@/components/ui/Harmony";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatCountdown, useCountdownToMidnight } from "@/hooks/useCountdownToMidnight";
import { formatDuration, plural } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { countLabel, KIND_COPY } from "@/lib/kinds";
import { useDaily } from "@/lib/queries";
import styles from "./quotidien.module.css";

export function DailyView() {
    const daily = useDaily();
    const remaining = useCountdownToMidnight(daily.data?.timeZone);
    const { settings } = useSettings();

    if (daily.error) return <ErrorState error={daily.error} onRetry={() => void daily.refetch()} />;
    if (!daily.data) return <Loading />;

    const { date, level, result, streak, share, solvedToday } = daily.data;
    const day = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const kind = KIND_COPY[level.kind];

    return (
        <Panel className={styles.panel}>
            <div className="tag">Énigme du jour · {day}</div>
            <h2>{level.title}</h2>
            <p className={styles.kind}>
                <span aria-hidden>{kind.glyph}</span> {kind.label} · {countLabel(level.kind, level.groupCount)} à trouver
            </p>

            <dl className={styles.streak}>
                <div>
                    <dt>Série en cours</dt>
                    <dd>{plural(streak.current, "jour")}</dd>
                </div>
                <div>
                    <dt>Meilleure série</dt>
                    <dd>{plural(streak.best, "jour")}</dd>
                </div>
                <div>
                    <dt>Résolue aujourd&apos;hui par</dt>
                    <dd>{plural(solvedToday, "joueur")}</dd>
                </div>
            </dl>

            {result ? (
                <section className={styles.result} aria-label="Ton résultat du jour">
                    <Harmony petals={result.petals} size="lg" />
                    {settings.showTimer && <p>{formatDuration(result.durationMs)}</p>}
                    {share && <pre className={styles.share}>{share}</pre>}
                    <div className="row" style={{ justifyContent: "center" }}>
                        {share && <ShareButton text={share} variant="primary" />}
                        <ButtonLink href={`/niveaux/${level.id}`} variant="ghost">
                            Rejouer (sans effet sur la série)
                        </ButtonLink>
                    </div>
                </section>
            ) : (
                <section className={styles.result}>
                    <p>
                        {streak.current > 0
                            ? `Résous-la aujourd'hui pour porter ta série à ${plural(streak.current + 1, "jour")}.`
                            : "Une énigme par jour, la même pour tout le monde. Prends le temps qu'il te faut."}
                    </p>
                    <ButtonLink href={`/niveaux/${level.id}`} variant="primary">
                        Découvrir l&apos;énigme
                    </ButtonLink>
                </section>
            )}

            {remaining !== null && <p className={styles.next}>Prochaine énigme dans {formatCountdown(remaining)}</p>}
        </Panel>
    );
}
