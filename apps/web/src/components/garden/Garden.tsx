import { useId, type ReactNode } from "react";
import { GARDEN_STAGE_COUNT, type WorldTheme } from "@aether/shared";
import { REGIONS } from "@/lib/regions";
import styles from "./Garden.module.css";

/** Taille de l'arbre principal à chaque stade (0 = pousse, pas encore d'arbre). */
const TREE_SCALE = [0, 0.36, 0.52, 0.68, 0.84, 1];
const LAST_STAGE = GARDEN_STAGE_COUNT - 1;

/** Positions fixes (pas de hasard : rendu serveur et client identiques). */
const STARS = Array.from({ length: 30 }, (_, i) => ({
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

const BUTTERFLIES = [
    { x: 60, y: 200, delay: 0, color: 0 },
    { x: 205, y: 185, delay: 2.4, color: 1 },
    { x: 345, y: 205, delay: 1.1, color: 2 },
];

interface Palette {
    sky: [string, string, string];
    /** Lueur de l'aube qui monte avec la restauration. */
    dawn: string;
    hillBack: string;
    hillFront: string;
    trunk: string;
    leaves: [string, string, string];
    flowers: [string, string, string];
    glow: string;
    stone: string;
}

/**
 * Palette de chaque région : bleu nuit, ivoire, or ancien, vert sauge, bois clair et pierre,
 * déclinés selon l'ambiance du lieu.
 */
const PALETTES: Record<WorldTheme, Palette> = {
    jardin: {
        sky: ["#1d3b4c", "#10223a", "#0e1f2c"],
        dawn: "#e8c98a",
        hillBack: "#1f3a33",
        hillFront: "#24443a",
        trunk: "#8a6a4c",
        leaves: ["#4f7a5a", "#6a9670", "#8fb58a"],
        flowers: ["#cfae5f", "#f2ead8", "#e6a8a0"],
        glow: "#cfae5f",
        stone: "#a39d91",
    },
    bibliotheque: {
        sky: ["#2b2c48", "#181b33", "#14172b"],
        dawn: "#d9a86a",
        hillBack: "#2b3036",
        hillFront: "#343a3a",
        trunk: "#9b7a58",
        leaves: ["#5c7a60", "#748f6c", "#a6c39a"],
        flowers: ["#c9a37a", "#f2ead8", "#cfae5f"],
        glow: "#e3c27f",
        stone: "#9a9184",
    },
    atelier: {
        sky: ["#2f2b3c", "#1b1b2b", "#151521"],
        dawn: "#e0a066",
        hillBack: "#2c2d33",
        hillFront: "#3a3530",
        trunk: "#8f6a48",
        leaves: ["#5a6f52", "#73885e", "#98ab7a"],
        flowers: ["#d39a6a", "#f2ead8", "#cfae5f"],
        glow: "#d39a6a",
        stone: "#8f877c",
    },
    observatoire: {
        sky: ["#16224a", "#0c1532", "#081024"],
        dawn: "#9fb3e0",
        hillBack: "#1a2440",
        hillFront: "#202c48",
        trunk: "#6b5c58",
        leaves: ["#3f5a72", "#567690", "#7c9cb4"],
        flowers: ["#cfae5f", "#f2ead8", "#9fb3e0"],
        glow: "#9fb3e0",
        stone: "#9b968c",
    },
    conservatoire: {
        sky: ["#2b3149", "#181e34", "#121729"],
        dawn: "#e9d9b2",
        hillBack: "#2a3240",
        hillFront: "#323b46",
        trunk: "#8a7058",
        leaves: ["#5a7468", "#738f7e", "#a6c39a"],
        flowers: ["#f2ead8", "#cfae5f", "#c9b6dd"],
        glow: "#e9d9b2",
        stone: "#d9d2bf",
    },
    foret: {
        sky: ["#15312b", "#0b1f1b", "#081613"],
        dawn: "#b9d98a",
        hillBack: "#15301f",
        hillFront: "#1a3a25",
        trunk: "#5e4a36",
        leaves: ["#2f5a3c", "#3f7650", "#5f9466"],
        flowers: ["#e0a46a", "#f2ead8", "#b9d98a"],
        glow: "#b9d98a",
        stone: "#7f8a78",
    },
    sommet: {
        sky: ["#34415f", "#1d2541", "#131b31"],
        dawn: "#f0cf86",
        hillBack: "#2c3448",
        hillFront: "#353d50",
        trunk: "#7d6a58",
        leaves: ["#566d68", "#6d8780", "#a6c39a"],
        flowers: ["#cfae5f", "#f2ead8", "#a6c39a"],
        glow: "#f0cf86",
        stone: "#a39d91",
    },
};

interface GardenProps {
    stage: number;
    theme?: WorldTheme;
    /** Place le jardin sans transition (premier affichage avant l'animation de croissance). */
    instant?: boolean;
    className?: string;
}

/**
 * Le paysage d'une région de l'Atlas, qui se restaure à mesure que l'on résout ses énigmes :
 * l'aube se lève, l'arbre grandit, le lieu (fontaine, coupole, rouages…) reprend vie, le
 * Gardien apparaît, puis les papillons et les lucioles.
 */
export function Garden({ stage, theme = "jardin", instant = false, className }: GardenProps) {
    const id = useId(); // plusieurs jardins par page : identifiants de dégradés uniques
    const p = PALETTES[theme] ?? PALETTES.jardin;
    const on = (minStage: number) => String(stage >= minStage);
    const percent = Math.round((stage / LAST_STAGE) * 100);
    const dawn = stage / LAST_STAGE;

    return (
        <div className={[styles.garden, className].filter(Boolean).join(" ")} data-instant={instant || undefined} style={{ background: p.sky[1] }}>
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label={`${REGIONS[theme]?.name ?? "Jardin"} restauré à ${percent} %`}>
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
                    <radialGradient id={`${id}-dawn`} cy="1">
                        <stop offset="0" stopColor={p.dawn} stopOpacity="0.55" />
                        <stop offset="1" stopColor={p.dawn} stopOpacity="0" />
                    </radialGradient>
                </defs>

                <rect width="400" height="300" fill={`url(#${id}-sky)`} />
                {/* L'aube se lève avec la restauration ; les étoiles pâlissent un peu. */}
                <ellipse className={styles.fade} cx="200" cy="240" rx="300" ry="150" fill={`url(#${id}-dawn)`} style={{ opacity: dawn }} />
                <g className={styles.stars} style={{ opacity: 1 - dawn * 0.45 }}>
                    {STARS.map((star, i) => (
                        <circle key={i} cx={star.x} cy={star.y} r={star.r} style={{ animationDelay: `${star.delay}s` }} />
                    ))}
                </g>

                <Backdrop theme={theme} stage={stage} p={p} on={on} />

                <circle className={styles.layer} data-on={on(5)} cx="130" cy="150" r="130" fill={`url(#${id}-glow)`} />

                <path d="M0 232 Q 100 200 205 224 T 400 214 V300 H0Z" fill={p.hillBack} />

                <Landmark theme={theme} stage={stage} p={p} on={on} />

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

                {/* Le Gardien, silencieux, contemple ce qui renaît. */}
                <g className={styles.layer} data-on={on(1)} transform="translate(176 251)">
                    <Guardian glow={p.glow} />
                </g>

                <g className={styles.layer} data-on={on(2)} fill={p.leaves[1]}>
                    <Tuft x={60} y={255} />
                    <Tuft x={215} y={250} />
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

                <g className={`${styles.layer} ${styles.butterflies}`} data-on={on(3)}>
                    {BUTTERFLIES.map((b, i) => (
                        <g key={i} transform={`translate(${b.x} ${b.y})`}>
                            <g className={styles.butterfly} style={{ animationDelay: `${b.delay}s` }}>
                                <Butterfly color={p.flowers[b.color]!} />
                            </g>
                        </g>
                    ))}
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

interface SceneProps {
    theme: WorldTheme;
    stage: number;
    p: Palette;
    on: (minStage: number) => string;
}

/** Arrière-plan lointain, derrière les collines. */
function Backdrop({ theme, stage, p, on }: SceneProps) {
    if (theme === "sommet") {
        // Les cimes, toujours là ; le soleil se lève derrière elles.
        const sunY = 210 - (stage / LAST_STAGE) * 110;
        return (
            <g>
                <circle className={styles.rise} cx="268" cy={sunY} r="22" fill={p.dawn} opacity="0.85" />
                <path d="M-10 236 L70 130 L120 190 L190 96 L262 200 L320 140 L410 236Z" fill={p.stone} opacity="0.55" />
                <path d="M70 130 L58 146 L72 142 L84 150Z M190 96 L174 118 L190 112 L206 122Z M320 140 L308 156 L322 152 L334 160Z" fill="#f2ead8" opacity="0.8" />
                <g className={`${styles.layer} ${styles.clouds}`} data-on={on(2)} fill="#f2ead8" fillOpacity="0.16">
                    <ellipse cx="90" cy="110" rx="40" ry="8" />
                    <ellipse cx="300" cy="90" rx="52" ry="9" />
                </g>
            </g>
        );
    }
    if (theme === "foret") {
        // Des arbres lointains reviennent un à un.
        return (
            <g fill={p.leaves[0]} opacity="0.55">
                {[
                    [30, 1],
                    [250, 2],
                    [380, 3],
                    [200, 4],
                ].map(([x, s]) => (
                    <g key={x} className={styles.layer} data-on={on(s!)} transform={`translate(${x} 228)`}>
                        <path d="M0 0 L-16 0 L0 -70 L16 0Z" />
                        <path d="M0 -30 L-20 -10 L20 -10Z" />
                    </g>
                ))}
            </g>
        );
    }
    if (theme === "observatoire") {
        // Une constellation se trace, segment après segment.
        const points: [number, number][] = [
            [40, 60],
            [85, 40],
            [130, 70],
            [175, 50],
            [215, 85],
            [255, 60],
            [300, 35],
            [345, 70],
            [380, 45],
            [320, 110],
            [270, 125],
        ];
        const shown = Math.round((stage / LAST_STAGE) * (points.length - 1));
        return (
            <g stroke={p.dawn} strokeOpacity="0.55" strokeWidth="1" fill={p.dawn}>
                {points.slice(1).map(([x, y], i) => (
                    <line key={i} className={styles.layer} data-on={String(i < shown)} x1={points[i]![0]} y1={points[i]![1]} x2={x} y2={y} />
                ))}
                {points.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={i <= shown ? 2 : 1.2} opacity={i <= shown ? 1 : 0.4} />
                ))}
            </g>
        );
    }
    return null;
}

/** Le lieu propre à chaque région, posé sur la colline lointaine. */
function Landmark({ theme, stage, p, on }: SceneProps) {
    const scenes: Record<WorldTheme, ReactNode> = {
        jardin: (
            // Une fontaine dont l'eau se remet à couler.
            <g className={styles.layer} data-on={on(2)} transform="translate(272 236)">
                <ellipse cx="0" cy="0" rx="26" ry="6" fill={p.stone} />
                <rect x="-24" y="-10" width="48" height="10" rx="3" fill={p.stone} opacity="0.85" />
                <rect x="-3" y="-30" width="6" height="22" fill={p.stone} />
                <ellipse cx="0" cy="-30" rx="12" ry="3" fill={p.stone} />
                <g className={`${styles.layer} ${styles.water}`} stroke="#bfe0e6" strokeWidth="1.6" fill="none" strokeLinecap="round" data-on={on(3)}>
                    <path d="M0 -32 C -6 -44 -14 -36 -18 -14" />
                    <path d="M0 -32 C 6 -44 14 -36 18 -14" />
                    <path d="M0 -32 L0 -42" />
                </g>
            </g>
        ),
        bibliotheque: (
            // Une arche de pierre aux rayonnages pleins ; des pages s'envolent.
            <g className={styles.layer} data-on={on(2)} transform="translate(362 222) scale(0.85)">
                <path d="M-30 0 V-46 A30 30 0 0 1 30 -46 V0 H22 V-44 A22 22 0 0 0 -22 -44 V0Z" fill={p.stone} />
                {[-36, -26, -16, -6].map((y) => (
                    <g key={y}>
                        <rect x="-21" y={y} width="42" height="1.6" fill="#5b4a3a" />
                        {[-18, -12, -7, -1, 5, 10, 15].map((x, i) => (
                            <rect key={x} x={x} y={y - 7} width="4" height="7" fill={[p.trunk, p.flowers[0], p.leaves[1], p.flowers[2]][i % 4]} />
                        ))}
                    </g>
                ))}
                <g className={`${styles.layer} ${styles.pages}`} data-on={on(3)} fill="#f2ead8">
                    <rect x="-60" y="-80" width="8" height="10" rx="1" />
                    <rect x="10" y="-100" width="7" height="9" rx="1" style={{ animationDelay: "-2s" }} />
                    <rect x="40" y="-70" width="8" height="10" rx="1" style={{ animationDelay: "-4s" }} />
                </g>
            </g>
        ),
        atelier: (
            // Deux rouages : posés au stade 2, ils se remettent à tourner au stade 3.
            <g className={styles.layer} data-on={on(2)} transform="translate(368 190)">
                <rect x="-2" y="18" width="4" height="34" fill={p.stone} />
                <g className={styles.gear} data-run={on(3)}>
                    <Cog r={22} teeth={9} fill={p.trunk} />
                </g>
                <g transform="translate(-30 20)">
                    <g className={`${styles.gear} ${styles.gearReverse}`} data-run={on(3)}>
                        <Cog r={13} teeth={7} fill={p.flowers[0]} />
                    </g>
                </g>
            </g>
        ),
        observatoire: (
            // La coupole et sa lunette, tournée vers le ciel retrouvé.
            <g className={styles.layer} data-on={on(1)} transform="translate(364 220)">
                <rect x="-24" y="-16" width="48" height="16" fill={p.stone} />
                <path d="M-24 -16 A24 24 0 0 1 24 -16Z" fill={p.stone} opacity="0.9" />
                <rect x="-3" y="-40" width="6" height="22" fill="#2a3150" />
                <g className={styles.layer} data-on={on(3)}>
                    <rect x="0" y="-52" width="5" height="26" fill={p.trunk} transform="rotate(35 2 -26)" />
                </g>
            </g>
        ),
        conservatoire: (
            // Des colonnes d'ivoire ; des notes flottent quand la musique revient.
            <g className={styles.layer} data-on={on(2)} transform="translate(362 224) scale(0.8)">
                <rect x="-38" y="-48" width="76" height="6" fill={p.stone} />
                {[-30, -10, 10, 30].map((x) => (
                    <rect key={x} x={x - 3} y="-42" width="6" height="42" fill={p.stone} opacity="0.92" />
                ))}
                <g className={`${styles.layer} ${styles.notes}`} data-on={on(3)} fill={p.dawn} fontSize="12">
                    <text x="-28" y="-58">
                        ♪
                    </text>
                    <text x="6" y="-70" style={{ animationDelay: "-1.5s" }}>
                        ♫
                    </text>
                    <text x="26" y="-56" style={{ animationDelay: "-3s" }}>
                        ♩
                    </text>
                </g>
            </g>
        ),
        foret: (
            // Des champignons qui luisent au pied des arbres.
            <g className={styles.layer} data-on={on(3)}>
                {[
                    [246, 246],
                    [258, 249],
                    [362, 238],
                ].map(([x, y], i) => (
                    <g key={i} transform={`translate(${x} ${y})`} className={styles.glow}>
                        <rect x="-1.2" y="-6" width="2.4" height="6" fill="#e8dcc0" />
                        <path d="M-6 -6 A6 5 0 0 1 6 -6Z" fill={p.flowers[0]} />
                    </g>
                ))}
            </g>
        ),
        sommet: (
            // Un cairn de pierres levées, que l'on complète en montant.
            <g transform="translate(366 222)" fill={p.stone}>
                <g className={styles.layer} data-on={on(1)}>
                    <ellipse cx="0" cy="-4" rx="14" ry="5" />
                </g>
                <g className={styles.layer} data-on={on(2)}>
                    <ellipse cx="0" cy="-12" rx="10" ry="4.5" />
                </g>
                <g className={styles.layer} data-on={on(3)}>
                    <ellipse cx="0" cy="-19" rx="7" ry="3.5" />
                </g>
                <g className={styles.layer} data-on={on(4)}>
                    <ellipse cx="0" cy="-25" rx="4.5" ry="2.6" fill={p.dawn} />
                </g>
            </g>
        ),
    };
    return <>{scenes[theme]}</>;
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

/** Le Gardien : une silhouette encapuchonnée, une petite lanterne à la main. */
function Guardian({ glow }: { glow: string }) {
    return (
        <g>
            <path d="M-5 0 C-5 -8 -4 -14 -2.5 -17 A3.2 3.2 0 1 1 2.5 -17 C4 -14 5 -8 5 0Z" fill="#0d1626" opacity="0.92" />
            <line x1="5" y1="-9" x2="8" y2="-5" stroke="#0d1626" strokeWidth="1.2" />
            <circle className={styles.lantern} cx="8.5" cy="-3.5" r="1.8" fill={glow} style={{ color: glow }} />
        </g>
    );
}

function Butterfly({ color }: { color: string }) {
    return (
        <g className={styles.wings}>
            <path d="M0 0 C-6 -6 -8 -1 -5 2 C-7 5 -2 6 0 1Z" fill={color} />
            <path d="M0 0 C6 -6 8 -1 5 2 C7 5 2 6 0 1Z" fill={color} />
        </g>
    );
}

function Cog({ r, teeth, fill }: { r: number; teeth: number; fill: string }) {
    // Quatre points par dent (pied, sommet, sommet, pied) : des dents carrées, pas une étoile.
    const step = (Math.PI * 2) / teeth;
    const points = Array.from({ length: teeth }, (_, i) => {
        const a = i * step;
        return [
            [a, r * 0.78],
            [a + step * 0.12, r],
            [a + step * 0.42, r],
            [a + step * 0.54, r * 0.78],
        ];
    })
        .flat()
        .map(([angle, radius]) => `${(Math.cos(angle!) * radius!).toFixed(2)},${(Math.sin(angle!) * radius!).toFixed(2)}`);
    return (
        <g>
            <polygon points={points.join(" ")} fill={fill} />
            <circle r={r * 0.32} fill="#1b1b2b" />
        </g>
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
            <circle cx={x} cy={y - 16} r="1.5" fill="#1d1a10" />
        </g>
    );
}
