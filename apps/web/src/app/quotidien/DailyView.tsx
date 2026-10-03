"use client";

import { buildShareText, computeStreak, goalCountOf } from "@aether/shared";
import { ShareButton } from "@/components/daily/ShareButton";
import { ButtonLink } from "@/components/ui/Button";
import { Harmony } from "@/components/ui/Harmony";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatCountdown, useCountdownToMidnight } from "@/hooks/useCountdownToMidnight";
import { plural } from "@/lib/format";
import { goalLabel, levelLabel } from "@/lib/kinds";
import { todayDaily, usePlayer } from "@/lib/offline/player";
import { useDaily } from "@/lib/queries";
import { levelHref } from "@/lib/routes";
import styles from "./quotidien.module.css";

/** L'énigme du jour, tirée d'avance et embarquée : elle se joue (et se compte) même hors ligne. */
export function DailyView() {
    const player = usePlayer();
    // En ligne seulement : combien de joueurs l'ont déjà résolue.
    const server = useDaily();
    const remaining = useCountdownToMidnight(player.data?.bundle.daily.timeZone);

    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    if (!player.data) return <Loading />;

    const { bundle, dailyResults, today } = player.data;
    const entry = todayDaily(bundle);
    if (!entry) {
        return (
            <Panel className={styles.panel}>
                <div className="tag">Énigme du jour</div>
                <p>Aucune énigme du jour n&apos;est disponible pour le moment. Reviens bientôt !</p>
            </Panel>
        );
    }

    const { level } = entry;
    const petals = dailyResults.get(today);
    const streak = computeStreak([...dailyResults.keys()], today);
    const share = petals === undefined ? null : buildShareText({ date: today, petals, streak: streak.current });
    const day = new Date(`${today}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const label = levelLabel(level.mechanic, level.kind);
    const solvedToday = server.data?.date === today ? server.data.solvedToday : null;

    return (
        <Panel className={styles.panel}>
            <div className="tag">Énigme du jour · {day}</div>
            <h2>{level.title}</h2>
            <p className={styles.kind}>
                <span aria-hidden>{label.glyph}</span> {label.label} · {goalLabel(level.mechanic, level.kind, goalCountOf(level))}
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
                {solvedToday !== null && (
                    <div>
                        <dt>Résolue aujourd&apos;hui par</dt>
                        <dd>{plural(solvedToday, "joueur")}</dd>
                    </div>
                )}
            </dl>

            {petals !== undefined ? (
                <section className={styles.result} aria-label="Ton résultat du jour">
                    <Harmony petals={petals} size="lg" />
                    {share && <pre className={styles.share}>{share}</pre>}
                    <div className="row" style={{ justifyContent: "center" }}>
                        {share && <ShareButton text={share} variant="primary" />}
                        <ButtonLink href={levelHref(level.id)} variant="ghost">
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
                    <ButtonLink href={levelHref(level.id)} variant="primary">
                        Découvrir l&apos;énigme
                    </ButtonLink>
                </section>
            )}

            {remaining !== null && <p className={styles.next}>Prochaine énigme dans {formatCountdown(remaining)}</p>}
        </Panel>
    );
}
