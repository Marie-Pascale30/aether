import type React from "react";
import { hasPetal, PETAL_KEYS } from "@aether/shared";
import styles from "./Herbarium.module.css";

/** Pétale de trille, base au centre (même dessin que la fleur d'harmonie, en plus petit). */
const PETAL = "M0 -1 C -10 -5, -11 -19, -3 -25 C -1 -26.5, 1 -26.5, 3 -25 C 11 -19, 10 -5, 0 -1 Z";

/** Petit nombre stable tiré d'un texte : chaque fleur a sa propre inclinaison, toujours la même. */
function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return (h >>> 0) / 4294967296;
}

/**
 * Une fleur séchée de l'herbier : sa tige, une feuille, et les trois pétales d'harmonie — pleins
 * quand ils ont été cueillis, esquissés sinon. `waiting` : l'énigme reste à résoudre.
 */
export function PressedFlower({ id, petals, accent, waiting = false }: { id: string; petals: number; accent: string; waiting?: boolean }) {
    const r = hash(id);
    const tilt = (r - 0.5) * 26;
    const leftLeaf = r > 0.5;
    return (
        <svg className={styles.flower} viewBox="-40 -44 80 104" aria-hidden data-waiting={waiting || undefined} style={{ "--accent": accent } as React.CSSProperties}>
            <g transform={`rotate(${tilt} 0 56)`}>
                <path className={styles.stem} d={`M0 56 C ${leftLeaf ? 4 : -4} 36, ${leftLeaf ? -3 : 3} 18, 0 0`} />
                <path
                    className={styles.leaf}
                    d={leftLeaf ? "M0 34 C -8 26, -20 26, -24 32 C -16 38, -6 38, 0 34 Z" : "M0 30 C 8 22, 20 22, 24 28 C 16 34, 6 34, 0 30 Z"}
                />
                {waiting ? (
                    <circle className={styles.bud} r="5" />
                ) : (
                    <>
                        {PETAL_KEYS.map((key, i) => (
                            <path
                                key={key}
                                d={PETAL}
                                transform={`rotate(${i * 120 + r * 40})`}
                                className={hasPetal(petals, key) ? styles.petal : styles.petalOff}
                            />
                        ))}
                        <circle className={styles.heart} r="3.6" />
                    </>
                )}
            </g>
        </svg>
    );
}
