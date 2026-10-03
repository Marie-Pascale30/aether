import { hasPetal, MAX_HARMONY_PER_LEVEL, PETAL_COPY, PETAL_KEYS } from "@aether/shared";
import styles from "./ui.module.css";

/** Les trois pétales d'harmonie d'une énigme : cueillis ou encore à cueillir, jamais perdus. */
export function Harmony({ petals, size = "md", animate = false }: { petals: number; size?: "sm" | "md" | "lg"; animate?: boolean }) {
    const earned = PETAL_KEYS.filter((key) => hasPetal(petals, key));
    const label =
        earned.length === 0
            ? "Harmonie à venir"
            : `Harmonie ${earned.length} sur ${MAX_HARMONY_PER_LEVEL} : ${earned.map((key) => PETAL_COPY[key].name).join(", ")}`;

    return (
        <span className={`${styles.harmony} ${styles[`harmony_${size}`]}`} role="img" aria-label={label} title={label}>
            {PETAL_KEYS.map((key, i) => (
                <span
                    key={key}
                    aria-hidden
                    className={hasPetal(petals, key) ? styles.petalOn : styles.petalOff}
                    style={animate ? { animationDelay: `${300 + i * 220}ms` } : undefined}
                    data-animate={animate || undefined}
                >
                    ✿
                </span>
            ))}
        </span>
    );
}
