import { hasPetal, MAX_HARMONY_PER_LEVEL, PETAL_COPY, PETAL_KEYS } from "@aether/shared";
import styles from "./HarmonyBloom.module.css";

/** Pétale large et arrondi (un trille : la fleur à trois pétales), base au centre (repère 0 0). */
const PETAL = "M0 -2 C -21 -10, -24 -40, -6 -52 C -2 -55, 2 -55, 6 -52 C 24 -40, 21 -10, 0 -2 Z";
/** Sépale vert, plus fin, glissé entre deux pétales. */
const SEPAL = "M0 0 C -6 -12, -6 -30, 0 -42 C 6 -30, 6 -12, 0 0 Z";

/**
 * La fleur d'harmonie du panneau de fin : trois pétales autour d'un cœur doré. Ceux qui viennent
 * d'être cueillis éclosent un à un ; ceux qui restent à cueillir sont esquissés, en attente.
 */
export function HarmonyBloom({ petals, fresh }: { petals: number; fresh: number }) {
    const earned = PETAL_KEYS.filter((key) => hasPetal(petals, key));
    const label = `Harmonie ${earned.length} sur ${MAX_HARMONY_PER_LEVEL} : ${earned.map((key) => PETAL_COPY[key].name).join(", ")}`;

    return (
        <svg className={styles.bloom} viewBox="-70 -70 140 140" role="img" aria-label={label}>
            <defs>
                <radialGradient id="harmony-petal" cx="0.5" cy="0.95" r="1">
                    <stop offset="0" stopColor="#fbecc0" />
                    <stop offset="0.55" stopColor="#e3c47a" />
                    <stop offset="1" stopColor="#c49a48" />
                </radialGradient>
                <radialGradient id="harmony-aura">
                    <stop offset="0" stopColor="#cfae5f" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#cfae5f" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle className={styles.aura} r="68" fill="url(#harmony-aura)" />
            {[60, 180, 300].map((angle) => (
                <path key={angle} d={SEPAL} className={styles.sepal} transform={`rotate(${angle})`} />
            ))}
            {PETAL_KEYS.map((key, i) => {
                const isEarned = hasPetal(petals, key);
                const isFresh = hasPetal(fresh, key);
                return (
                    <g key={key} transform={`rotate(${i * 120})`}>
                        <path
                            d={PETAL}
                            strokeLinejoin="round"
                            className={isEarned ? styles.petal : styles.open}
                            data-fresh={isFresh || undefined}
                            style={{ animationDelay: `${0.35 + i * 0.28}s` }}
                        />
                    </g>
                );
            })}
            <circle className={styles.heart} r="8" />
            {[0, 72, 144, 216, 288].map((angle) => (
                <circle key={angle} className={styles.stamen} r="1.6" cx={Math.sin((angle * Math.PI) / 180) * 12} cy={-Math.cos((angle * Math.PI) / 180) * 12} />
            ))}
        </svg>
    );
}
