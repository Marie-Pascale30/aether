"use client";

import { useState } from "react";
import styles from "./SymbolPalette.module.css";

/** Symboles proposés, par famille : de quoi composer des énigmes sans chercher ses emojis. */
const FAMILIES: { name: string; symbols: string[] }[] = [
    { name: "Formes", symbols: ["○", "●", "◐", "◑", "◒", "◓", "△", "▽", "▲", "□", "◇", "⬡", "◉", "⌂"] },
    { name: "Astres", symbols: ["☀", "☾", "🌙", "⭐", "✦", "✧", "🌑", "🌒", "🌓", "🌔", "🌕", "🌅"] },
    { name: "Nature", symbols: ["🌱", "🌿", "🌳", "🌲", "🍂", "🌰", "🌸", "🍎", "🍐", "🍒"] },
    { name: "Éléments", symbols: ["🔥", "💧", "❄", "☁", "🌧", "🌊", "🪨", "🌬", "≈", "🌈"] },
    { name: "Vivant", symbols: ["🦊", "🦉", "🦌", "🐟", "🐚", "🐝"] },
    { name: "Signes", symbols: ["➜", "↗", "◀", "▶", "⚀", "⚁", "⚂", "⚃", "▁", "▃", "▅", "◔", "◕", "🕐", "🕑", "🕒", "🕓"] },
];

interface Props {
    /** Symboles déjà sur le plateau (signalés pour repérer les doublons voulus ou non). */
    used: string[];
    /** Où ira le symbole choisi (« case 3 », « nouvelle case »). */
    targetLabel: string;
    onPick: (symbol: string) => void;
}

export function SymbolPalette({ used, targetLabel, onPick }: Props) {
    const [family, setFamily] = useState(FAMILIES[0]!.name);
    const current = FAMILIES.find((f) => f.name === family) ?? FAMILIES[0]!;
    const usedCount = (symbol: string) => used.filter((s) => s === symbol).length;

    return (
        <section className={styles.palette} aria-label="Palette de symboles">
            <div className={styles.head}>
                <h4>Palette</h4>
                <small>→ {targetLabel}</small>
            </div>
            <div className={styles.tabs} role="tablist" aria-label="Familles de symboles">
                {FAMILIES.map((f) => (
                    <button
                        key={f.name}
                        type="button"
                        role="tab"
                        aria-selected={f.name === family}
                        className={styles.tab}
                        onClick={() => setFamily(f.name)}
                    >
                        {f.name}
                    </button>
                ))}
            </div>
            <div className={styles.grid} role="tabpanel" aria-label={current.name}>
                {current.symbols.map((symbol) => {
                    const count = usedCount(symbol);
                    return (
                        <button
                            key={symbol}
                            type="button"
                            className={styles.symbol}
                            onClick={() => onPick(symbol)}
                            title={count ? `Déjà ${count}× sur le plateau` : `Placer ${symbol}`}
                            aria-label={`Placer ${symbol}${count ? ` (déjà ${count} sur le plateau)` : ""}`}
                        >
                            {symbol}
                            {count > 0 && <span className={styles.count}>{count}</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
