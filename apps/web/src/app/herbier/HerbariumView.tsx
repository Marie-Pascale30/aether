"use client";

import Link from "next/link";
import { petalCount, type ContentWorld, type LevelRecord, type WorldSummary } from "@aether/shared";
import { PressedFlower } from "@/components/herbarium/PressedFlower";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { plural } from "@/lib/format";
import { usePlayer } from "@/lib/offline/player";
import { REGIONS } from "@/lib/regions";
import { levelHref } from "@/lib/routes";
import styles from "./herbier.module.css";

/** Jours montrés dans la frise des fleurs du jour. */
const DAYS = 28;

/** L'herbier : une fleur séchée pour chaque énigme résolue, et une pour chaque énigme du jour. */
export function HerbariumView() {
    const player = usePlayer();
    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    if (!player.data) return <Loading />;

    const { bundle, journey, records, dailyResults, today } = player.data;
    const contentOf = new Map(bundle.worlds.map((world) => [world.id, world]));
    // Seules comptent les fleurs visibles : celles des régions ouvertes.
    const gathered = journey.worlds
        .filter((world) => world.status !== "locked")
        .flatMap((world) => contentOf.get(world.id)?.levels ?? [])
        .filter((level) => records.has(level.id)).length;

    return (
        <div className="stack">
            <header className={styles.head}>
                <div className="tag">Herbier</div>
                <h2 className={styles.title}>Les fleurs du chemin</h2>
                <p className="muted">
                    Chaque énigme résolue laisse ici une fleur, avec les pétales d&apos;harmonie cueillis.{" "}
                    {plural(gathered, "fleur")} pressée{gathered > 1 ? "s" : ""} pour l&apos;instant. Le récit, lui, revient dans{" "}
                    <Link href="/livre">le Livre de l&apos;Atlas</Link>.
                </p>
            </header>

            {journey.worlds.map((world) => {
                const content = contentOf.get(world.id);
                return content ? <Plate key={world.id} world={world} content={content} records={records} /> : null;
            })}

            <DailyFlowers results={dailyResults} today={today} />
        </div>
    );
}

/** Une planche de l'herbier : les énigmes d'une région. */
function Plate({ world, content, records }: { world: WorldSummary; content: ContentWorld; records: Map<string, LevelRecord> }) {
    const region = REGIONS[world.theme];
    if (world.status === "locked") {
        return (
            <Panel className={styles.plate} data-locked>
                <h2 className={styles.plateTitle}>
                    <span aria-hidden>{region.glyph}</span> {region.name}
                </h2>
                <p className="muted">Planche encore vierge : la région est scellée.</p>
            </Panel>
        );
    }
    return (
        <Panel className={styles.plate}>
            <h2 className={styles.plateTitle}>
                <span aria-hidden style={{ color: region.accent }}>
                    {region.glyph}
                </span>{" "}
                {region.name}
                <small>
                    {world.garden.completedLevels} / {world.garden.totalLevels}
                </small>
            </h2>
            <ol className={styles.grid}>
                {content.levels.map((level, i) => {
                    const record = records.get(level.id);
                    const petals = record?.petals ?? 0;
                    const label = record
                        ? `${level.title} : ${plural(petalCount(petals), "pétale")} sur 3`
                        : `${level.title} : à cueillir`;
                    return (
                        <li key={level.id}>
                            <Link href={levelHref(level.id)} className={styles.specimen} aria-label={label} data-waiting={!record || undefined}>
                                <PressedFlower id={level.id} petals={petals} accent={region.accent} waiting={!record} />
                                <span className={styles.caption}>
                                    <span className={styles.number}>{String(i + 1).padStart(2, "0")}</span>
                                    {record ? level.title : "à cueillir"}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </Panel>
    );
}

/** Les fleurs du jour : une case par jour, fleurie quand l'énigme du jour a été résolue. */
function DailyFlowers({ results, today }: { results: Map<string, number>; today: string }) {
    const base = new Date(`${today}T12:00:00Z`).getTime();
    const days = Array.from({ length: DAYS }, (_, i) => {
        const date = new Date(base - (DAYS - 1 - i) * 86_400_000);
        return { key: date.toISOString().slice(0, 10), date };
    });
    const bloomed = days.filter((day) => results.has(day.key)).length;

    return (
        <Panel className={styles.plate}>
            <h2 className={styles.plateTitle}>
                <span aria-hidden>☼</span> Fleurs du jour
                <small>{plural(bloomed, "jour")} sur 28</small>
            </h2>
            <ol className={styles.days}>
                {days.map(({ key, date }) => {
                    const petals = results.get(key);
                    const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
                    return (
                        <li
                            key={key}
                            className={styles.day}
                            data-today={key === today || undefined}
                            aria-label={petals === undefined ? `${day} : pas de fleur` : `${day} : ${plural(petalCount(petals), "pétale")}`}
                        >
                            {petals === undefined ? (
                                <span className={styles.empty} aria-hidden />
                            ) : (
                                <PressedFlower id={key} petals={petals} accent="#cfae5f" />
                            )}
                            <span className={styles.date} aria-hidden>
                                {date.getUTCDate()}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </Panel>
    );
}
