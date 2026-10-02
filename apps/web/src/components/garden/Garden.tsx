import { useId } from "react";
import { GARDEN_STAGE_COUNT, type WorldTheme } from "@aether/shared";
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

interface Palette {
    sky: [string, string, string];
    hillBack: string;
    hillFront: string;
    trunk: string;
    leaves: [string, string, string];
    flowers: [string, string, string];
    glow: string;
}

/** Une palette par monde ; le dessin reste le même, seule l'ambiance change. */
const PALETTES: Record<WorldTheme, Palette> = {
    origines: {
        sky: ["#163e40", "#0b252c", "#10251e"],
        hillBack: "#12332c",
        hillFront: "#15382d",
        trunk: "#5b4a3a",
        leaves: ["#2f6b4f", "#3d8a5f", "#4f9c6a"],
        flowers: ["#d9bd72", "#edf1df", "#8ce5dc"],
        glow: "#d9bd72",
    },
    foret: {
        sky: ["#13301f", "#0b1f17", "#0c1a12"],
        hillBack: "#10291b",
        hillFront: "#14301f",
        trunk: "#4a3a2c",
        leaves: ["#1f5236", "#2b6a45", "#3f8452"],
        flowers: ["#e0a46a", "#edf1df", "#b9d98a"],
        glow: "#b9d98a",
    },
    ocean: {
        sky: ["#123848", "#0a2533", "#0b2230"],
        hillBack: "#134552",
        hillFront: "#2c3a33",
        trunk: "#6b5640",
        leaves: ["#2a6b66", "#348680", "#4aa39a"],
        flowers: ["#8ce5dc", "#edf1df", "#f0c27a"],
        glow: "#8ce5dc",
    },
    cosmos: {
        sky: ["#231c45", "#130f2b", "#0e0c20"],
        hillBack: "#1d1838",
        hillFront: "#241e42",
        trunk: "#4b3f5e",
        leaves: ["#4b3f8a", "#6352a8", "#7d6cc4"],
        flowers: ["#d9bd72", "#edf1df", "#b49cf0"],
        glow: "#b49cf0",
    },
};

interface GardenProps {
    stage: number;
    theme?: WorldTheme;
    /** Place le jardin sans transition (premier affichage avant l'animation de croissance). */
    instant?: boolean;
    className?: string;
}

export function Garden({ stage, theme = "origines", instant = false, className }: GardenProps) {
    const id = useId(); // plusieurs jardins par page : identifiants de dégradés uniques
    const p = PALETTES[theme];
    const on = (minStage: number) => String(stage >= minStage);
    const percent = Math.round((stage / (GARDEN_STAGE_COUNT - 1)) * 100);

    return (
        <div className={[styles.garden, className].filter(Boolean).join(" ")} data-instant={instant || undefined} style={{ background: p.sky[1] }}>
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label={`Jardin restauré à ${percent} %`}>
                <defs>
                    <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0.4" y2="1">
                        <stop offset="0" stopColor={p.sky[0]} />
                        <stop offset="0.6" stopColor={p.sky[1]} />
                        <stop offset="1" stopColor={p.sky[2]} />
                    </linearGradient>
                    <radialGradient id={`${id}-glow`}>
                        <stop offset="0" stopColor={p.glow} stopOpacity="0.35" />
                        <stop offset="1" stopColor={p.glow} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect width="400" height="300" fill={`url(#${id}-sky)`} />

                <g className={styles.stars}>
                    {STARS.map((star, i) => (
                        <circle key={i} cx={star.x} cy={star.y} r={star.r} style={{ animationDelay: `${star.delay}s` }} />
                    ))}
                </g>

                {theme === "cosmos" && (
                    <g opacity="0.8">
                        <circle cx="320" cy="70" r="26" fill="#3a2f6b" />
                        <ellipse cx="320" cy="70" rx="44" ry="8" fill="none" stroke="#b49cf0" strokeOpacity="0.5" strokeWidth="2" />
                    </g>
                )}

                <circle className={styles.layer} data-on={on(5)} cx="130" cy="150" r="130" fill={`url(#${id}-glow)`} />

                <path d="M0 232 Q 100 200 205 224 T 400 214 V300 H0Z" fill={p.hillBack} />
                {theme === "ocean" && (
                    <g className={styles.waves} stroke="#8ce5dc" strokeOpacity="0.25" strokeWidth="1.5" fill="none">
                        <path d="M20 236 q 15 -6 30 0 t 30 0" />
                        <path d="M210 230 q 15 -6 30 0 t 30 0 t 30 0" />
                        <path d="M120 244 q 15 -6 30 0 t 30 0" />
                    </g>
                )}

                {/* Second arbre, plus lointain */}
                <g transform="translate(305 226)">
                    <g className={`${styles.layer} ${styles.grow}`} data-on={on(3)} style={{ transform: `scale(${stage >= 4 ? 0.5 : 0.36})` }}>
                        <Tree palette={p} />
                    </g>
                </g>

                <path d="M0 252 Q 120 228 232 247 T 400 240 V300 H0Z" fill={p.hillFront} />

                {/* Pousse initiale */}
                <g className={styles.layer} data-on={String(stage === 0)} transform="translate(130 250)">
                    <path d="M0 0 C 0 -10 1 -18 0 -26" stroke={p.leaves[2]} strokeWidth="2.4" fill="none" strokeLinecap="round" />
                    <ellipse cx="-7" cy="-20" rx="7" ry="3.4" transform="rotate(-25 -7 -20)" fill={p.leaves[2]} />
                    <ellipse cx="7" cy="-25" rx="7" ry="3.4" transform="rotate(25 7 -25)" fill={p.leaves[1]} />
                </g>

                {/* Arbre principal */}
                <g transform="translate(130 250)">
                    <g className={`${styles.layer} ${styles.grow}`} data-on={on(1)} style={{ transform: `scale(${TREE_SCALE[stage] ?? 1})` }}>
                        <Tree palette={p} />
                    </g>
                </g>

                <g className={styles.layer} data-on={on(2)} fill={p.leaves[1]}>
                    <Tuft x={60} y={255} />
                    <Tuft x={205} y={250} />
                    <Tuft x={360} y={246} />
                </g>

                <g className={styles.layer} data-on={on(2)}>
                    <Flower x={82} y={257} color={p.flowers[0]} stem={p.leaves[1]} />
                    <Flower x={98} y={262} color={p.flowers[1]} stem={p.leaves[1]} />
                </g>

                <g className={styles.layer} data-on={on(4)}>
                    <Flower x={228} y={253} color={p.flowers[2]} stem={p.leaves[1]} />
                    <Flower x={246} y={258} color={p.flowers[0]} stem={p.leaves[1]} />
                    <Flower x={265} y={252} color={p.flowers[1]} stem={p.leaves[1]} />
                    <ellipse cx="350" cy="252" rx="26" ry="12" fill={p.leaves[0]} />
                    <ellipse cx="372" cy="254" rx="18" ry="9" fill={p.leaves[1]} />
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
function Tree({ palette: p }: { palette: Palette }) {
    return (
        <>
            <path d="M-6 0 C-5 -40 -9 -72 -3 -104 L3 -104 C9 -72 5 -40 6 0Z" fill={p.trunk} />
            <path d="M-2 -70 C-16 -80 -26 -86 -34 -98" stroke={p.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M2 -78 C16 -86 26 -92 34 -102" stroke={p.trunk} strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="-34" cy="-104" r="32" fill={p.leaves[0]} />
            <circle cx="36" cy="-108" r="34" fill={p.leaves[0]} />
            <circle cx="0" cy="-128" r="46" fill={p.leaves[1]} />
            <circle cx="-14" cy="-160" r="30" fill={p.leaves[2]} />
            <circle cx="20" cy="-150" r="28" fill={p.leaves[2]} />
        </>
    );
}

function Tuft({ x, y }: { x: number; y: number }) {
    return <path d={`M${x - 8} ${y} Q ${x - 6} ${y - 12} ${x - 2} ${y - 16} Q ${x} ${y - 8} ${x + 1} ${y} Q ${x + 4} ${y - 14} ${x + 9} ${y - 12} Q ${x + 6} ${y - 5} ${x + 8} ${y}Z`} />;
}

function Flower({ x, y, color, stem }: { x: number; y: number; color: string; stem: string }) {
    return (
        <g>
            <path d={`M${x} ${y} L${x} ${y - 14}`} stroke={stem} strokeWidth="1.6" />
            <circle cx={x} cy={y - 16} r="4" fill={color} />
            <circle cx={x} cy={y - 16} r="1.5" fill="#132019" />
        </g>
    );
}
