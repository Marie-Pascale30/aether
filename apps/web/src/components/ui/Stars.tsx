import { MAX_STARS_PER_LEVEL } from "@aether/shared";
import styles from "./ui.module.css";

export function Stars({ count, size = "md", animate = false }: { count: number | null; size?: "sm" | "md" | "lg"; animate?: boolean }) {
    const earned = count ?? 0;
    return (
        <span className={`${styles.stars} ${styles[`stars_${size}`]}`} role="img" aria-label={`${earned} étoile${earned > 1 ? "s" : ""} sur ${MAX_STARS_PER_LEVEL}`}>
            {Array.from({ length: MAX_STARS_PER_LEVEL }, (_, i) => (
                <span
                    key={i}
                    aria-hidden
                    className={i < earned ? styles.starOn : styles.starOff}
                    style={animate ? { animationDelay: `${300 + i * 220}ms` } : undefined}
                    data-animate={animate || undefined}
                >
                    ★
                </span>
            ))}
        </span>
    );
}
