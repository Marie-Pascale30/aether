"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useSettings, type MotionPreference, type SymbolSize } from "@/lib/settings";
import { useSound } from "@/lib/sound/SoundProvider";
import styles from "./reglages.module.css";

const MOTION_OPTIONS: { value: MotionPreference; label: string; hint: string }[] = [
    { value: "system", label: "Suivre le système", hint: "Respecte le réglage « réduire les animations » de l'appareil." },
    { value: "reduce", label: "Réduire", hint: "Pas de croissance animée, de tracés ni de scintillement." },
    { value: "full", label: "Toujours animer", hint: "Toutes les animations, même si l'appareil demande moins." },
];

const SYMBOL_OPTIONS: { value: SymbolSize; label: string }[] = [
    { value: "normal", label: "Normale" },
    { value: "large", label: "Grande" },
];

export function SettingsView() {
    const { settings, update, reset } = useSettings();
    const { play } = useSound();
    const volumeId = useId();

    return (
        <Panel className={styles.panel}>
            <div className="tag">Préférences de cet appareil</div>
            <h2>Réglages</h2>

            <section className={styles.section} aria-labelledby="reglages-son">
                <h3 id="reglages-son">Son</h3>
                <Toggle checked={!settings.muted} onChange={(on) => update({ muted: !on })} label="Son activé" />
                <div className={styles.range}>
                    <label htmlFor={volumeId}>Volume</label>
                    <input
                        id={volumeId}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(settings.volume * 100)}
                        onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
                        disabled={settings.muted}
                        aria-valuetext={`${Math.round(settings.volume * 100)} %`}
                    />
                    <output htmlFor={volumeId}>{Math.round(settings.volume * 100)} %</output>
                </div>
                <Toggle checked={settings.effects} onChange={(effects) => update({ effects })} label="Effets (sélection, liens, réussite)" disabled={settings.muted} />
                <Toggle checked={settings.ambient} onChange={(ambient) => update({ ambient })} label="Nappe d'ambiance" disabled={settings.muted} />
                <Button variant="ghost" onClick={() => play("match")} disabled={settings.muted || !settings.effects}>
                    ♪ Tester le son
                </Button>
            </section>

            <section className={styles.section} aria-labelledby="reglages-affichage">
                <h3 id="reglages-affichage">Affichage</h3>
                <Choice
                    legend="Animations"
                    name="motion"
                    value={settings.motion}
                    options={MOTION_OPTIONS}
                    onChange={(motion) => update({ motion })}
                />
                <Choice
                    legend="Taille des symboles sur le plateau"
                    name="symbols"
                    value={settings.symbols}
                    options={SYMBOL_OPTIONS}
                    onChange={(symbols) => update({ symbols })}
                />
            </section>

            <section className={styles.section} aria-labelledby="reglages-rythme">
                <h3 id="reglages-rythme">Rythme</h3>
                <Toggle
                    checked={settings.equilibre}
                    onChange={(equilibre) => update({ equilibre })}
                    label="Équilibre : un souffle d'aide quand une énigme résiste"
                />
                <Toggle
                    checked={settings.showTimer}
                    onChange={(showTimer) => update({ showTimer })}
                    label="Afficher le temps (rien ne presse : il est masqué par défaut)"
                />
            </section>

            <section className={styles.section} aria-labelledby="reglages-clavier">
                <h3 id="reglages-clavier">Jouer au clavier</h3>
                <ul className={styles.keys}>
                    <li>
                        <kbd>Tab</kbd> atteint le plateau, puis <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> passent d&apos;une case à l&apos;autre.
                    </li>
                    <li>
                        <kbd>Entrée</kbd> ou <kbd>Espace</kbd> choisit la case ; la choisir à nouveau l&apos;annule.
                    </li>
                    <li>
                        <kbd>Début</kbd> et <kbd>Fin</kbd> vont à la première et à la dernière case ; <kbd>Échap</kbd> ferme le panneau de fin.
                    </li>
                </ul>
            </section>

            <Button variant="ghost" onClick={reset}>
                Rétablir les réglages par défaut
            </Button>
        </Panel>
    );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode; disabled?: boolean }) {
    return (
        <label className={styles.toggle} data-disabled={disabled || undefined}>
            <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
            <span className={styles.switch} aria-hidden />
            {label}
        </label>
    );
}

function Choice<T extends string>({
    legend,
    name,
    value,
    options,
    onChange,
}: {
    legend: string;
    name: string;
    value: T;
    options: { value: T; label: string; hint?: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <fieldset className={styles.choice}>
            <legend>{legend}</legend>
            {options.map((option) => (
                <label key={option.value} className={styles.option}>
                    <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
                    <span>
                        {option.label}
                        {option.hint && <small>{option.hint}</small>}
                    </span>
                </label>
            ))}
        </fieldset>
    );
}
