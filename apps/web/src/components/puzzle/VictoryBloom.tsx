import type { CSSProperties } from "react";
import styles from "./VictoryBloom.module.css";

/** Parcelles de lumière : positions et rythmes fixes (identiques à chaque victoire, sans hasard au rendu). */
const MOTES = Array.from({ length: 22 }, (_, i) => ({
    x: ((i * 37) % 100) - 50,
    drift: ((i * 53) % 40) - 20,
    delay: (i % 7) * 0.09,
    size: 3 + (i % 4),
    rise: 140 + ((i * 29) % 120),
}));

/**
 * Le moment de la victoire : une lumière dorée naît au centre du plateau et s'étend, des parcelles
 * de lumière montent, puis le panneau de fin s'ouvre. Purement décoratif (masqué aux lecteurs
 * d'écran, absent avec les animations réduites).
 */
export function VictoryBloom() {
    return (
        <div className={styles.bloom} aria-hidden>
            <span className={styles.glow} />
            <span className={styles.ring} />
            <span className={`${styles.ring} ${styles.ringLate}`} />
            {MOTES.map((mote, i) => (
                <span
                    key={i}
                    className={styles.mote}
                    style={
                        {
                            "--x": `${mote.x}%`,
                            "--drift": `${mote.drift}px`,
                            "--rise": `${mote.rise}px`,
                            "--size": `${mote.size}px`,
                            animationDelay: `${0.25 + mote.delay}s`,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}
