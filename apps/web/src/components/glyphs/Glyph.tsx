import { GLYPHS } from "./glyphs";
import styles from "./Glyph.module.css";

/**
 * Un symbole d'énigme : dessiné s'il fait partie du jeu de glyphes, sinon le caractère tel quel.
 * Décoratif : le nom accessible vient de l'élément qui le contient (case, bouton…).
 */
export function Glyph({ symbol, className }: { symbol: string; className?: string }) {
    const drawing = GLYPHS[symbol];
    if (!drawing) {
        return (
            <span className={[styles.text, className].filter(Boolean).join(" ")} aria-hidden>
                {symbol}
            </span>
        );
    }
    return (
        <svg className={[styles.glyph, className].filter(Boolean).join(" ")} viewBox="0 0 24 24" aria-hidden>
            {drawing}
        </svg>
    );
}

/**
 * Une suite de symboles (Échos : « ●●○ », « ↑ → ») dessinés côte à côte. Le texte d'origine reste
 * lisible par les lecteurs d'écran (sauf `silent`, quand l'élément parent porte déjà le nom).
 */
export function GlyphRow({ text, className, silent = false }: { text: string; className?: string; silent?: boolean }) {
    const symbols = [...text].filter((char) => char.trim() !== "");
    return (
        <span className={[styles.row, className].filter(Boolean).join(" ")}>
            {!silent && <span className="visually-hidden">{text}</span>}
            {symbols.map((symbol, i) => (
                <Glyph key={i} symbol={symbol} />
            ))}
        </span>
    );
}
