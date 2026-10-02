import { GARDEN_STAGE_COUNT } from "@aether/shared";
import styles from "./Garden.module.css";

/** Taille de l'arbre principal à chaque stade (0 = pousse, pas encore d'arbre). */
const TREE_SCALE = [0, 0.36, 0.52, 0.68, 0.84, 1];

/** Positions fixes (pas de hasard : rendu serveur et client identiques). */
const STARS = Array.from({ length: 26 }, (_, i) => ({
    x: (i * 97 + 23) % 400,
    y: (i * 53 + 11) % 170,
    r: i % 3 === 0 ? 1.4 : 0.9,
    delay: (i % 7) * 0.6,
}));

const FIREFLIES = [
    { x: 70, y: 200, delay: 0 },
    { x: 180, y: 160, delay: 1.2 },
    { x: 250, y: 205, delay: 2.1 },
    { x: 330, y: 170, delay: 0.7 },
    { x: 140, y: 215, delay: 2.8 },
];

interface GardenProps {
    stage: number;
    /** Place le jardin sans transition (premier affichage avant l'animation de croissance). */
    instant?: boolean;
    className?: string;
}

export function Garden({ stage, instant = false, className }: GardenProps) {
    const on = (minStage: number) => String(stage >= minStage);
    const percent = Math.round((stage / (GARDEN_STAGE_COUNT - 1)) * 100);

    return (
        <div className={[styles.garden, className].filter(Boolean).join(" ")} data-instant={instant || undefined}>
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label={`Jardin restauré à ${percent} %`}>
                <defs>
                    <linearGradient id="garden-sky" x1="0" y1="0" x2="0.4" y2="1">
                        <stop offset="0" stopColor="#163e40" />
                        <stop offset="0.6" stopColor="#0b252c" />
                        <stop offset="1" stopColor="#10251e" />
                    </linearGradient>
                    <radialGradient id="garden-glow">
                        <stop offset="0" stopColor="#d9bd72" stopOpacity="0.35" />
                        <stop offset="1" stopColor="#d9bd72" stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect width="400" height="300" fill="url(#garden-sky)" />

                <g className={styles.stars}>
                    {STARS.map((star, i) => (
                        <circle key={i} cx={star.x} cy={star.y} r={star.r} style={{ animationDelay: `${star.delay}s` }} />
                    ))}
                </g>

                <circle className={styles.layer} data-on={on(5)} cx="130" cy="150" r="130" fill="url(#garden-glow)" />

                <path d="M0 232 Q 100 200 205 224 T 400 214 V300 H0Z" fill="#12332c" />

                {/* Second arbre, plus lointain */}
                <g transform="translate(305 226)">
                    <g className={`${styles.layer} ${styles.grow}`} data-on={on(3)} style={{ transform: `scale(${stage >= 4 ? 0.5 : 0.36})` }}>
                        <Tree />
                    </g>
                </g>

                <path d="M0 252 Q 120 228 232 247 T 400 240 V300 H0Z" fill="#15382d" />

                {/* Pousse initiale */}
                <g className={styles.layer} data-on={String(stage === 0)} transform="translate(130 250)">
                    <path d="M0 0 C 0 -10 1 -18 0 -26" stroke="#75b78a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                    <ellipse cx="-7" cy="-20" rx="7" ry="3.4" transform="rotate(-25 -7 -20)" fill="#75b78a" />
                    <ellipse cx="7" cy="-25" rx="7" ry="3.4" transform="rotate(25 7 -25)" fill="#8fcf9f" />
                </g>

                {/* Arbre principal */}
                <g transform="translate(130 250)">
                    <g className={`${styles.layer} ${styles.grow}`} data-on={on(1)} style={{ transform: `scale(${TREE_SCALE[stage] ?? 1})` }}>
                        <Tree />
                    </g>
                </g>

                <g className={styles.layer} data-on={on(2)} fill="#3d8a5f">
                    <Tuft x={60} y={255} />
                    <Tuft x={205} y={250} />
                    <Tuft x={360} y={246} />
                </g>

                <g className={styles.layer} data-on={on(2)}>
                    <Flower x={82} y={257} color="#d9bd72" />
                    <Flower x={98} y={262} color="#edf1df" />
                </g>

                <g className={styles.layer} data-on={on(4)}>
                    <Flower x={228} y={253} color="#8ce5dc" />
                    <Flower x={246} y={258} color="#d9bd72" />
                    <Flower x={265} y={252} color="#edf1df" />
                    <ellipse cx="350" cy="252" rx="26" ry="12" fill="#2f6b4f" />
                    <ellipse cx="372" cy="254" rx="18" ry="9" fill="#3d8a5f" />
                </g>

                <g className={`${styles.layer} ${styles.fireflies}`} data-on={on(5)}>
                    {FIREFLIES.map((fly, i) => (
                        <circle key={i} cx={fly.x} cy={fly.y} r="2.2" style={{ animationDelay: `${fly.delay}s` }} />
                    ))}
                </g>
            </svg>
        </div>
    );
}

/** Arbre dessiné à l'échelle 1, pied à l'origine, poussant vers le haut. */
function Tree() {
    return (
        <>
            <path d="M-6 0 C-5 -40 -9 -72 -3 -104 L3 -104 C9 -72 5 -40 6 0Z" fill="#5b4a3a" />
            <path d="M-2 -70 C-16 -80 -26 -86 -34 -98" stroke="#5b4a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M2 -78 C16 -86 26 -92 34 -102" stroke="#5b4a3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="-34" cy="-104" r="32" fill="#2f6b4f" />
            <circle cx="36" cy="-108" r="34" fill="#2f6b4f" />
            <circle cx="0" cy="-128" r="46" fill="#3d8a5f" />
            <circle cx="-14" cy="-160" r="30" fill="#4f9c6a" />
            <circle cx="20" cy="-150" r="28" fill="#4f9c6a" />
        </>
    );
}

function Tuft({ x, y }: { x: number; y: number }) {
    return <path d={`M${x - 8} ${y} Q ${x - 6} ${y - 12} ${x - 2} ${y - 16} Q ${x} ${y - 8} ${x + 1} ${y} Q ${x + 4} ${y - 14} ${x + 9} ${y - 12} Q ${x + 6} ${y - 5} ${x + 8} ${y}Z`} />;
}

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
    return (
        <g>
            <path d={`M${x} ${y} L${x} ${y - 14}`} stroke="#3d8a5f" strokeWidth="1.6" />
            <circle cx={x} cy={y - 16} r="4" fill={color} />
            <circle cx={x} cy={y - 16} r="1.5" fill="#132019" />
        </g>
    );
}
