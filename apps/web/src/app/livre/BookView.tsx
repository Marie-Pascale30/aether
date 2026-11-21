"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorldSummary } from "@aether/shared";
import { Garden } from "@/components/garden/Garden";
import { Button } from "@/components/ui/Button";
import { ErrorState, Loading } from "@/components/ui/States";
import { CHAPTERS, readablePages, untilNextPage } from "@/lib/book";
import { plural } from "@/lib/format";
import { usePlayer } from "@/lib/offline/player";
import { REGIONS } from "@/lib/regions";
import { worldHref } from "@/lib/routes";
import { useAmbience } from "@/lib/sound/SoundProvider";
import styles from "./livre.module.css";

/** Le Livre de l'Atlas : le récit de chaque région, qui revient page après page. */
export function BookView() {
    const player = usePlayer();
    const worlds = player.data?.journey.worlds ?? [];
    // On ouvre le livre à la dernière région ouverte : celle que le joueur est en train de restaurer.
    const [index, setIndex] = useState<number | null>(null);
    const current = index ?? Math.max(0, worlds.map((world) => world.status !== "locked").lastIndexOf(true));
    const world = worlds[current];
    useAmbience(world?.theme);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
            if (event.key === "ArrowLeft") setIndex(Math.max(0, current - 1));
            if (event.key === "ArrowRight") setIndex(Math.min(worlds.length - 1, current + 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [current, worlds.length]);

    if (player.error) return <ErrorState error={player.error} onRetry={player.retry} />;
    if (!player.data) return <Loading />;
    if (!world) return <p>Le livre est encore vierge.</p>;

    return (
        <div className="stack">
            <header className={styles.head}>
                <div className="tag">Le Livre de l&apos;Atlas</div>
                <h2 className={styles.title}>Ce que l&apos;Atlas se rappelle</h2>
                <p className="muted">
                    Chaque énigme résolue rend au livre un peu de son récit. Les pages reviennent par tiers ; l&apos;herbier, lui,
                    garde <Link href="/herbier">une fleur pour chaque énigme</Link>.
                </p>
            </header>

            <article className={styles.book} aria-roledescription="livre" aria-label={`Chapitre ${current + 1} sur ${worlds.length}`}>
                <Spread key={world.id} world={world} />
            </article>

            <nav className={styles.turn} aria-label="Chapitres">
                <Button onClick={() => setIndex(current - 1)} disabled={current === 0} aria-label="Chapitre précédent">
                    ‹
                </Button>
                <ol className={styles.dots}>
                    {worlds.map((item, i) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                className={styles.dot}
                                data-state={item.status}
                                aria-current={i === current ? "page" : undefined}
                                aria-label={`Chapitre ${i + 1} : ${REGIONS[item.theme].name}${item.status === "locked" ? " (scellé)" : ""}`}
                                onClick={() => setIndex(i)}
                            />
                        </li>
                    ))}
                </ol>
                <Button onClick={() => setIndex(current + 1)} disabled={current === worlds.length - 1} aria-label="Chapitre suivant">
                    ›
                </Button>
            </nav>
        </div>
    );
}

function Spread({ world }: { world: WorldSummary }) {
    const chapter = CHAPTERS[world.theme];
    const region = REGIONS[world.theme];
    const { completedLevels, totalLevels } = world.garden;
    const sealed = world.status === "locked";
    const pages = sealed ? 0 : readablePages(completedLevels, totalLevels);
    const missing = untilNextPage(completedLevels, totalLevels);

    return (
        <div className={styles.spread} data-sealed={sealed || undefined}>
            <div className={styles.left}>
                <div className={styles.folio}>
                    Chapitre {world.position} · {region.faculty}
                </div>
                <Garden stage={world.garden.stage} theme={world.theme} instant className={styles.garden} />
                <p className={styles.region}>
                    <span aria-hidden style={{ color: region.accent }}>
                        {region.glyph}
                    </span>{" "}
                    {region.name}
                </p>
            </div>

            <div className={styles.right}>
                <h2 className={styles.chapter}>{sealed ? "Page scellée" : chapter.title}</h2>
                {sealed ? (
                    <p className={styles.sealed}>
                        Ces pages ne s&apos;ouvriront qu&apos;avec la région. Restaure d&apos;abord celles qui la précèdent.
                    </p>
                ) : (
                    <>
                        {chapter.pages.map((text, i) =>
                            i < pages ? (
                                <p key={i} className={`${styles.page} ${i === 0 ? styles.first : ""}`}>
                                    {text}
                                </p>
                            ) : (
                                <div key={i} className={styles.faded} aria-hidden>
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            ),
                        )}
                        {world.status === "completed" ? (
                            <p className={styles.seal}>
                                <span aria-hidden>❦</span> {chapter.seal}
                            </p>
                        ) : (
                            <p className={styles.more}>
                                {pages < 3
                                    ? `Encore ${plural(missing, "énigme")} pour lire la suite.`
                                    : "Le récit est revenu ; il ne manque plus que la dernière ligne."}{" "}
                                <Link href={worldHref(world.slug)}>{world.title}</Link>
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
