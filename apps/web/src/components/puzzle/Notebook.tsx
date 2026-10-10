"use client";

import { useEffect, useId, useState } from "react";
import styles from "./Puzzle.module.css";

const key = (levelId: string) => `aether:carnet:${levelId}`;

function read(levelId: string): string {
    try {
        return localStorage.getItem(key(levelId)) ?? "";
    } catch {
        return "";
    }
}

/**
 * Carnet de notes d'une énigme : pour poser une idée, une piste, un ordre à retenir. Il reste sur
 * cet appareil (rien n'est envoyé) et se retrouve en revenant sur l'énigme.
 */
export function Notebook({ levelId }: { levelId: string }) {
    const id = useId();
    const [text, setText] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setText(read(levelId));
        setLoaded(true);
    }, [levelId]);

    useEffect(() => {
        if (!loaded) return;
        const timer = setTimeout(() => {
            try {
                if (text.trim()) localStorage.setItem(key(levelId), text);
                else localStorage.removeItem(key(levelId));
            } catch {
                // stockage indisponible : le carnet vaut pour la session
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [text, levelId, loaded]);

    return (
        <div className={styles.notebook}>
            <label htmlFor={id}>Carnet de notes</label>
            <textarea
                id={id}
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Une idée, une piste, un ordre à retenir…"
            />
            <small>Ton carnet reste sur cet appareil.</small>
        </div>
    );
}
