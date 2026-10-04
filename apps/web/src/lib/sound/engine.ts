import type { WorldTheme } from "@aether/shared";
import { AMBIENCES, type AmbienceRecipe, type Instrument } from "./ambience";

export type Cue = "select" | "deselect" | "match" | "mismatch" | "complete" | "hint";

interface Note {
    freq: number;
    delay?: number;
    duration: number;
    instrument?: Instrument | "soft";
    peak?: number;
}

/** Signature sonore de chaque évènement de jeu (fréquences en Hz, durées en secondes). */
const CUES: Record<Cue, Note[]> = {
    select: [{ freq: 659.25, duration: 0.3, instrument: "harp", peak: 0.06 }],
    deselect: [{ freq: 440, duration: 0.25, instrument: "harp", peak: 0.045 }],
    match: [
        { freq: 523.25, duration: 1.2, instrument: "piano" },
        { freq: 659.25, delay: 0.09, duration: 1.2, instrument: "piano" },
        { freq: 783.99, delay: 0.18, duration: 1.6, instrument: "piano" },
    ],
    // Une fausse piste n'est pas une faute : un son grave et doux, jamais un « buzz ».
    mismatch: [
        { freq: 220, duration: 0.6, instrument: "soft", peak: 0.08 },
        { freq: 207.65, delay: 0.06, duration: 0.6, instrument: "soft", peak: 0.06 },
    ],
    complete: [
        { freq: 523.25, duration: 1.8, instrument: "harp" },
        { freq: 659.25, delay: 0.12, duration: 1.8, instrument: "harp" },
        { freq: 783.99, delay: 0.24, duration: 1.8, instrument: "harp" },
        { freq: 1046.5, delay: 0.36, duration: 2.4, instrument: "piano", peak: 0.12 },
    ],
    hint: [
        { freq: 880, duration: 0.8, instrument: "harp", peak: 0.05 },
        { freq: 1318.5, delay: 0.1, duration: 1, instrument: "harp", peak: 0.035 },
    ],
};

/** Partiels de chaque timbre : (multiple de la fondamentale, amplitude relative). */
const TIMBRES: Record<Instrument | "soft", { partials: [number, number][]; attack: number; type: OscillatorType }> = {
    piano: { partials: [[1, 1], [2, 0.42], [3, 0.16], [4, 0.07]], attack: 0.008, type: "sine" },
    harp: { partials: [[1, 1], [2, 0.3], [3, 0.08]], attack: 0.004, type: "triangle" },
    soft: { partials: [[1, 1]], attack: 0.04, type: "sine" },
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

interface Ambience {
    theme: WorldTheme;
    gain: GainNode;
    nodes: AudioScheduledSourceNode[];
    timers: ReturnType<typeof setTimeout>[];
}

/**
 * Sons synthétisés en direct (Web Audio) : aucun fichier à charger, donc disponibles hors ligne.
 * L'ambiance de chaque région de l'Atlas mêle un instrument (piano ou harpe, quelques notes
 * d'une gamme pentatonique) et la nature (vent, eau, oiseaux), le tout dans une réverbération
 * douce. L'AudioContext n'est créé qu'au premier geste du joueur (règle d'autoplay).
 */
export class SoundEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private reverb: AudioNode | null = null;
    private noise: AudioBuffer | null = null;
    private ambience: Ambience | null = null;
    private theme: WorldTheme = "jardin";
    private ambientWanted = false;
    private volume = 0.6;

    /** Volume général (0–1), appliqué en douceur pour éviter les claquements. */
    setVolume(volume: number): void {
        this.volume = Math.min(1, Math.max(0, volume));
        if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }

    play(cue: Cue): void {
        const ctx = this.context();
        if (!ctx) return;
        for (const note of CUES[cue]) this.note(ctx, note);
    }

    /** Change de région : l'ambiance en cours s'efface pendant que la nouvelle monte. */
    setTheme(theme: WorldTheme): void {
        if (theme === this.theme) return;
        this.theme = theme;
        if (this.ambientWanted && this.ambience) {
            this.fadeOut(this.ambience);
            this.ambience = this.createAmbience(theme);
        }
    }

    startAmbient(): void {
        this.ambientWanted = true;
        if (!this.ambience) this.ambience = this.createAmbience(this.theme);
    }

    stopAmbient(): void {
        this.ambientWanted = false;
        if (this.ambience) this.fadeOut(this.ambience);
        this.ambience = null;
    }

    // ─── Ambiance ──────────────────────────────────────────────────────────

    private createAmbience(theme: WorldTheme): Ambience | null {
        const ctx = this.context();
        if (!ctx || !this.master) return null;
        const recipe = AMBIENCES[theme];
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 4);
        gain.connect(this.master);

        const ambience: Ambience = { theme, gain, nodes: [], timers: [] };
        if (recipe.wind > 0) this.wind(ctx, ambience, recipe.wind);
        if (recipe.water > 0) this.water(ctx, ambience, recipe.water);
        this.schedulePhrase(ambience, recipe, 1.5);
        if (recipe.birds > 0) this.scheduleBirds(ambience, recipe.birds, random(2, 6));
        return ambience;
    }

    private fadeOut(ambience: Ambience): void {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        ambience.timers.forEach(clearTimeout);
        ambience.timers = [];
        ambience.gain.gain.cancelScheduledValues(now);
        ambience.gain.gain.setTargetAtTime(0, now, 0.8);
        ambience.nodes.forEach((node) => node.stop(now + 4));
        setTimeout(() => ambience.gain.disconnect(), 4500);
    }

    /** Quelques notes de l'instrument de la région (parfois un petit arpège), puis un silence. */
    private schedulePhrase(ambience: Ambience, recipe: AmbienceRecipe, inSeconds: number): void {
        const timer = setTimeout(() => {
            const ctx = this.ctx;
            if (!ctx || this.ambience !== ambience) return;
            const start = Math.floor(random(0, recipe.scale.length - 2));
            const count = Math.random() < 0.4 ? 3 : Math.random() < 0.5 ? 2 : 1;
            for (let i = 0; i < count; i++) {
                const freq = recipe.scale[Math.min(recipe.scale.length - 1, start + i * (Math.random() < 0.5 ? 1 : 2))]!;
                this.note(ctx, { freq, delay: i * random(0.35, 0.7), duration: random(2.4, 3.6), instrument: recipe.instrument, peak: random(0.025, 0.045) }, ambience.gain);
            }
            this.schedulePhrase(ambience, recipe, random(...recipe.pause));
        }, inSeconds * 1000);
        ambience.timers.push(timer);
    }

    /** Le vent : un souffle filtré dont la hauteur et l'intensité respirent lentement. */
    private wind(ctx: AudioContext, ambience: Ambience, level: number): void {
        const source = this.noiseSource(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 420;
        filter.Q.value = 0.8;
        const gain = ctx.createGain();
        gain.gain.value = 0.05 * level;

        const sweep = ctx.createOscillator();
        const sweepDepth = ctx.createGain();
        sweep.frequency.value = 0.06;
        sweepDepth.gain.value = 220;
        sweep.connect(sweepDepth).connect(filter.frequency);

        const swell = ctx.createOscillator();
        const swellDepth = ctx.createGain();
        swell.frequency.value = 0.09;
        swellDepth.gain.value = 0.03 * level;
        swell.connect(swellDepth).connect(gain.gain);

        source.connect(filter).connect(gain).connect(ambience.gain);
        [source, sweep, swell].forEach((node) => node.start());
        ambience.nodes.push(source, sweep, swell);
    }

    /** L'eau : un ruisseau (bruit filtré qui ondule) et, de temps à autre, une goutte. */
    private water(ctx: AudioContext, ambience: Ambience, level: number): void {
        const source = this.noiseSource(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 900;
        const gain = ctx.createGain();
        gain.gain.value = 0.03 * level;

        const ripple = ctx.createOscillator();
        const rippleDepth = ctx.createGain();
        ripple.frequency.value = 0.7;
        rippleDepth.gain.value = 260;
        ripple.connect(rippleDepth).connect(filter.frequency);

        source.connect(filter).connect(gain).connect(ambience.gain);
        [source, ripple].forEach((node) => node.start());
        ambience.nodes.push(source, ripple);

        const drop = () => {
            const timer = setTimeout(() => {
                if (!this.ctx || this.ambience !== ambience) return;
                const t = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const env = this.ctx.createGain();
                const freq = random(900, 1600);
                osc.frequency.setValueAtTime(freq, t);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.07);
                env.gain.setValueAtTime(0.0001, t);
                env.gain.exponentialRampToValueAtTime(0.025 * level, t + 0.005);
                env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
                osc.connect(env).connect(ambience.gain);
                osc.start(t);
                osc.stop(t + 0.1);
                drop();
            }, random(0.6, 3.5) * 1000);
            ambience.timers.push(timer);
        };
        drop();
    }

    /** Les oiseaux : de courtes phrases de gazouillis, d'un côté puis de l'autre. */
    private scheduleBirds(ambience: Ambience, level: number, inSeconds: number): void {
        const timer = setTimeout(() => {
            const ctx = this.ctx;
            if (!ctx || this.ambience !== ambience) return;
            const pan = ctx.createStereoPanner();
            pan.pan.value = random(-0.8, 0.8);
            pan.connect(ambience.gain);
            const base = random(2400, 3600);
            const chirps = Math.floor(random(2, 5));
            for (let i = 0; i < chirps; i++) {
                const t = ctx.currentTime + i * random(0.12, 0.2);
                const osc = ctx.createOscillator();
                const env = ctx.createGain();
                osc.frequency.setValueAtTime(base, t);
                osc.frequency.exponentialRampToValueAtTime(base * random(1.2, 1.5), t + 0.05);
                osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.1);
                env.gain.setValueAtTime(0.0001, t);
                env.gain.exponentialRampToValueAtTime(0.012 * level, t + 0.01);
                env.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
                osc.connect(env).connect(pan);
                osc.start(t);
                osc.stop(t + 0.12);
            }
            this.scheduleBirds(ambience, level, random(6, 16) / Math.max(level, 0.3));
        }, inSeconds * 1000);
        ambience.timers.push(timer);
    }

    // ─── Briques ───────────────────────────────────────────────────────────

    private context(): AudioContext | null {
        if (typeof window === "undefined" || !("AudioContext" in window)) return null;
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.volume;
            this.master.connect(this.ctx.destination);
            this.reverb = this.createReverb(this.ctx, this.master);
        }
        if (this.ctx.state === "suspended") void this.ctx.resume();
        return this.ctx;
    }

    /** Réverbération douce : une réponse impulsionnelle de bruit qui s'éteint en ~2,5 s. */
    private createReverb(ctx: AudioContext, out: AudioNode): AudioNode {
        const length = Math.floor(ctx.sampleRate * 2.5);
        const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = 0.35;
        convolver.connect(wet).connect(out);
        return convolver;
    }

    private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
        if (!this.noise) {
            const length = ctx.sampleRate * 3;
            this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        }
        const source = ctx.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        return source;
    }

    /** Une note d'un instrument : partiels harmoniques, attaque nette, extinction naturelle. */
    private note(ctx: AudioContext, { freq, delay = 0, duration, instrument = "piano", peak = 0.14 }: Note, out: AudioNode = this.master!): void {
        const start = ctx.currentTime + delay;
        const timbre = TIMBRES[instrument];
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(peak, start + timbre.attack);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        env.connect(out);
        if (this.reverb) env.connect(this.reverb);

        const total = timbre.partials.reduce((sum, [, amplitude]) => sum + amplitude, 0);
        for (const [multiple, amplitude] of timbre.partials) {
            const osc = ctx.createOscillator();
            const partial = ctx.createGain();
            osc.type = multiple === 1 ? timbre.type : "sine";
            osc.frequency.value = freq * multiple;
            partial.gain.value = amplitude / total;
            osc.connect(partial).connect(env);
            osc.start(start);
            osc.stop(start + duration + 0.05);
        }
    }
}
