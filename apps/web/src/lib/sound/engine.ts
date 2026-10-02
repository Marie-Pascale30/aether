export type Cue = "select" | "deselect" | "match" | "mismatch" | "complete" | "hint";

interface Note {
    freq: number;
    delay?: number;
    duration: number;
    type?: OscillatorType;
    peak?: number;
}

/** Signature sonore de chaque évènement de jeu (fréquences en Hz, durées en secondes). */
const CUES: Record<Cue, Note[]> = {
    select: [{ freq: 659.25, duration: 0.14, peak: 0.07 }],
    deselect: [{ freq: 440, duration: 0.12, peak: 0.05 }],
    match: [
        { freq: 523.25, duration: 0.5 },
        { freq: 659.25, delay: 0.08, duration: 0.5 },
        { freq: 783.99, delay: 0.16, duration: 0.7 },
    ],
    mismatch: [
        { freq: 196, duration: 0.28, type: "triangle", peak: 0.12 },
        { freq: 185, delay: 0.04, duration: 0.3, type: "triangle", peak: 0.1 },
    ],
    complete: [
        { freq: 523.25, duration: 0.9 },
        { freq: 659.25, delay: 0.12, duration: 0.9 },
        { freq: 783.99, delay: 0.24, duration: 0.9 },
        { freq: 1046.5, delay: 0.36, duration: 1.4, peak: 0.14 },
    ],
    hint: [
        { freq: 880, duration: 0.35, peak: 0.06 },
        { freq: 1318.5, delay: 0.1, duration: 0.5, peak: 0.04 },
    ],
};

/**
 * Sons synthétisés en direct (Web Audio) : aucun fichier à charger.
 * L'AudioContext n'est créé qu'au premier geste du joueur (règle d'autoplay des navigateurs).
 */
export class SoundEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private ambient: { gain: GainNode; sources: AudioScheduledSourceNode[] } | null = null;

    play(cue: Cue): void {
        const ctx = this.context();
        if (!ctx || !this.master) return;
        for (const note of CUES[cue]) this.tone(ctx, this.master, note);
    }

    /** Nappe d'ambiance douce : deux sinus graves filtrés, qui respirent lentement. */
    startAmbient(): void {
        const ctx = this.context();
        if (!ctx || !this.master || this.ambient) return;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 4);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 520;
        filter.connect(gain).connect(this.master);

        const voices = [110, 164.81, 220.5].map((freq, i) => {
            const osc = ctx.createOscillator();
            osc.frequency.value = freq;
            osc.detune.value = (i - 1) * 6;
            osc.connect(filter);
            return osc;
        });

        const lfo = ctx.createOscillator();
        const lfoDepth = ctx.createGain();
        lfo.frequency.value = 0.07;
        lfoDepth.gain.value = 0.015;
        lfo.connect(lfoDepth).connect(gain.gain);

        const sources = [...voices, lfo];
        sources.forEach((source) => source.start());
        this.ambient = { gain, sources };
    }

    stopAmbient(): void {
        if (!this.ctx || !this.ambient) return;
        const { gain, sources } = this.ambient;
        const end = this.ctx.currentTime + 1.5;
        gain.gain.cancelScheduledValues(this.ctx.currentTime);
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
        sources.forEach((source) => source.stop(end));
        this.ambient = null;
    }

    private context(): AudioContext | null {
        if (typeof window === "undefined" || !("AudioContext" in window)) return null;
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.6;
            this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === "suspended") void this.ctx.resume();
        return this.ctx;
    }

    private tone(ctx: AudioContext, out: AudioNode, { freq, delay = 0, duration, type = "sine", peak = 0.18 }: Note) {
        const start = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.0001, start);
        env.gain.exponentialRampToValueAtTime(peak, start + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(env).connect(out);
        osc.start(start);
        osc.stop(start + duration + 0.05);
    }
}
