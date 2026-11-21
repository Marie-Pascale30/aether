import { hasPetal, PETAL_KEYS, petalCount } from "@aether/shared";
import { skyPhase, type SkyPhase } from "@/hooks/useSkyTime";

export interface PostcardInput {
    /** Jour « AAAA-MM-JJ ». */
    date: string;
    petals: number;
    streak: number;
    /** Région de l'énigme du jour. */
    region: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

/** Même trille que la fleur d'harmonie (repère 0 0 à la base du pétale). */
const PETAL = "M0 -2 C -21 -10, -24 -40, -6 -52 C -2 -55, 2 -55, 6 -52 C 24 -40, 21 -10, 0 -2 Z";
const SEPAL = "M0 0 C -6 -12, -6 -30, 0 -42 C 6 -30, 6 -12, 0 0 Z";

const SKIES: Record<SkyPhase, [string, string, string]> = {
    night: ["#1d2a4c", "#121c3a", "#0c1530"],
    dawn: ["#3b4a78", "#b48a8e", "#efc58f"],
    day: ["#5d8db0", "#97b8cc", "#d9d3bd"],
    dusk: ["#3b3566", "#a3607a", "#e6a06a"],
};

/** Police d'une variable CSS posée par next/font (repli sur une famille générique). */
function fontOf(variable: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value || fallback;
}

/** Petits nombres pseudo-aléatoires stables, pour que deux cartes du même jour soient identiques. */
function seeded(seed: string) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
}

/** Dessine la carte postale du jour et la rend en PNG. */
export async function drawPostcard(input: PostcardInput): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");

    const display = fontOf("--font-display", "Georgia, serif");
    const text = fontOf("--font-text", "system-ui, sans-serif");
    // Les polices du jeu doivent être chargées avant d'écrire sur le canvas.
    await Promise.all([document.fonts.load(`500 80px ${display}`), document.fonts.load(`600 30px ${text}`)]).catch(() => undefined);

    const phase = skyPhase(new Date().getHours());
    const random = seeded(input.date);

    // Ciel.
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.78);
    SKIES[phase].forEach((color, i) => sky.addColorStop(i / 2, color));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Étoiles, la nuit et entre chien et loup.
    if (phase !== "day") {
        const count = phase === "night" ? 90 : 35;
        for (let i = 0; i < count; i++) {
            ctx.globalAlpha = 0.25 + random() * 0.6;
            ctx.fillStyle = "#f2ead8";
            ctx.beginPath();
            ctx.arc(random() * WIDTH, random() * HEIGHT * 0.6, 0.8 + random() * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // Collines.
    const hill = (y: number, lift: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(WIDTH * 0.3, y - lift, WIDTH * 0.6, y + lift * 0.6, WIDTH, y - lift * 0.4);
        ctx.lineTo(WIDTH, HEIGHT);
        ctx.lineTo(0, HEIGHT);
        ctx.closePath();
        ctx.fill();
    };
    hill(1040, 70, "#22402f");
    hill(1120, 50, "#1a3326");

    // Halo derrière la fleur.
    const cx = WIDTH / 2;
    const cy = 690;
    const aura = ctx.createRadialGradient(cx, cy, 0, cx, cy, 330);
    aura.addColorStop(0, "rgba(232, 200, 114, 0.38)");
    aura.addColorStop(1, "rgba(232, 200, 114, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // La fleur d'harmonie : pétales cueillis dorés, les autres esquissés.
    const scale = 4.6;
    const petal = new Path2D(PETAL);
    const sepal = new Path2D(SEPAL);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#5f8a55";
    for (const angle of [60, 180, 300]) {
        ctx.save();
        ctx.rotate((angle * Math.PI) / 180);
        ctx.fill(sepal);
        ctx.restore();
    }
    const gold = ctx.createRadialGradient(0, 0, 0, 0, -30, 60);
    gold.addColorStop(0, "#fbecc0");
    gold.addColorStop(0.55, "#e3c47a");
    gold.addColorStop(1, "#c49a48");
    PETAL_KEYS.forEach((key, i) => {
        ctx.save();
        ctx.rotate((i * 120 * Math.PI) / 180);
        if (hasPetal(input.petals, key)) {
            ctx.fillStyle = gold;
            ctx.fill(petal);
        } else {
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(242, 234, 216, 0.55)";
            ctx.stroke(petal);
        }
        ctx.restore();
    });
    ctx.fillStyle = "#f3dc92";
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Textes.
    const day = new Date(`${input.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const write = (value: string, y: number, font: string, color: string, spacing = 0) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.letterSpacing = `${spacing}px`;
        ctx.fillText(value, cx, y);
    };
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 18;
    write("A E T H E R", 140, `600 30px ${text}`, "#e8c872", 8);
    write(day.charAt(0).toUpperCase() + day.slice(1), 250, `500 84px ${display}`, "#f6efe0");
    write(`Énigme du jour · ${input.region}`, 316, `500 34px ${text}`, "rgba(246, 239, 224, 0.82)");

    const count = petalCount(input.petals);
    write(`${count} pétale${count > 1 ? "s" : ""} d'harmonie`, 1180, `500 54px ${display}`, "#f6efe0");
    if (input.streak > 1) write(`Série de ${input.streak} jours`, 1236, `500 32px ${text}`, "rgba(246, 239, 224, 0.8)");
    write("Un moment de plaisir pour l'esprit", 1300, `italic 500 30px ${display}`, "rgba(232, 200, 114, 0.85)");

    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image impossible"))), "image/png"));
}
