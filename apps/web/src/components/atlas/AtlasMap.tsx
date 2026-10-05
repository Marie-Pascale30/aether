"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import type { WorldSummary } from "@aether/shared";
import { REGIONS } from "@/lib/regions";
import { worldHref } from "@/lib/routes";
import styles from "./AtlasMap.module.css";

const WIDTH = 700;
const HEIGHT = 300;
const MARGIN = 90;

/**
 * Position de chaque région : réparties de gauche à droite, une haute, une basse (deux voisines
 * ne partagent jamais une ligne, leurs noms ne se chevauchent pas), la dernière — le Sommet —
 * plus haut que toutes.
 */
function layout(count: number): [number, number][] {
    return Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? WIDTH / 2 : MARGIN + (i * (WIDTH - 2 * MARGIN)) / (count - 1);
        const last = i === count - 1 && count > 2;
        // Le Sommet, un peu à l'écart : son nom ne touche pas la région précédente.
        return last ? [x + 25, 44] : [x, i % 2 === 0 ? 205 : 105];
    });
}

/**
 * La carte de l'Atlas des Esprits : chaque région est une étape du sentier. Le chemin s'éclaire
 * jusqu'aux régions ouvertes ; celle où l'on se trouve respire doucement.
 */
export function AtlasMap({ worlds }: { worlds: WorldSummary[] }) {
    const router = useRouter();
    const points = layout(worlds.length);
    const current = worlds.findIndex((world) => world.status === "available");

    const go = (event: MouseEvent, href: string) => {
        event.preventDefault();
        router.push(href);
    };

    return (
        <figure className={styles.atlas}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Carte de l'Atlas des Esprits">
                <path className={styles.trail} d={`M${points.map(([x, y]) => `${x} ${y}`).join(" L")}`} />
                {points.slice(1).map(([x, y], i) => (
                    <line
                        key={i}
                        className={styles.lit}
                        data-on={worlds[i + 1]!.status !== "locked" || undefined}
                        x1={points[i]![0]}
                        y1={points[i]![1]}
                        x2={x}
                        y2={y}
                    />
                ))}
                {worlds.map((world, i) => {
                    const [x, y] = points[i]!;
                    const region = REGIONS[world.theme];
                    const locked = world.status === "locked";
                    const node = (
                        <g className={styles.node} data-status={world.status} data-current={i === current || undefined} style={{ ["--accent" as string]: region.accent }}>
                            <circle className={styles.halo} cx={x} cy={y} r="30" />
                            <circle className={styles.disc} cx={x} cy={y} r="22" />
                            <text className={styles.glyph} x={x} y={y + 1}>
                                {locked ? "⌬" : region.glyph}
                            </text>
                            <text className={styles.label} x={x} y={y + 44}>
                                {world.title}
                            </text>
                            <text className={styles.faculty} x={x} y={y + 60}>
                                {region.faculty}
                            </text>
                        </g>
                    );
                    const label = `${world.title} — ${region.faculty}${locked ? " (scellé)" : world.status === "completed" ? " (restauré)" : ""}`;
                    return locked ? (
                        <g key={world.id} role="img" aria-label={label}>
                            {node}
                        </g>
                    ) : (
                        <a key={world.id} className={styles.link} href={worldHref(world.slug)} onClick={(event) => go(event, worldHref(world.slug))} aria-label={label}>
                            {node}
                        </a>
                    );
                })}
            </svg>
        </figure>
    );
}
