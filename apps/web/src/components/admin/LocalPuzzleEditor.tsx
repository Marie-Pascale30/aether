"use client";

import { useEffect, useState } from "react";
import {
    generatePuzzle,
    type EchoesPuzzle,
    type FlowPuzzle,
    type GearsPuzzle,
    type LocalMechanic,
    type LocalPuzzle,
    type MemoryPuzzle,
} from "@aether/shared";
import { EchoesBoard } from "@/components/mechanics/EchoesBoard";
import { FlowBoard } from "@/components/mechanics/FlowBoard";
import { GearsBoard } from "@/components/mechanics/GearsBoard";
import { MemoryBoard } from "@/components/mechanics/MemoryBoard";
import { Button } from "@/components/ui/Button";
import type { PuzzleReport } from "@/hooks/useLocalPuzzle";
import type { ApiIssue } from "@/lib/api";
import { MECHANIC_COPY } from "@/lib/kinds";
import styles from "./LevelEditor.module.css";

interface Props {
    mechanic: LocalMechanic;
    puzzle: unknown;
    issues: ApiIssue[];
    onChange: (puzzle: unknown) => void;
}

/** Rapport muet : l'aperçu se joue, mais n'envoie rien et ne fait aucun bruit. */
const silentReport = (onSolved: () => void): PuzzleReport => ({
    mistake: () => {},
    advance: () => {},
    progress: () => {},
    select: () => {},
    solved: onSolved,
});

const randomSeed = () => Math.random().toString(36).slice(2, 8);

/**
 * Éditeur des mécaniques jouées sur l'appareil : génération procédurale (difficulté + graine),
 * retouches à la main en JSON, et aperçu jouable du plateau.
 */
export function LocalPuzzleEditor({ mechanic, puzzle, issues, onChange }: Props) {
    const [difficulty, setDifficulty] = useState(3);
    const [seed, setSeed] = useState(randomSeed);
    const [json, setJson] = useState(() => JSON.stringify(puzzle, null, 1));
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [solvedPreview, setSolvedPreview] = useState(false);

    // Le plateau peut changer de l'extérieur (génération, changement de mécanique).
    useEffect(() => {
        setJson(JSON.stringify(puzzle, null, 1));
        setJsonError(null);
        setSolvedPreview(false);
    }, [puzzle]);

    const generate = (nextSeed = seed) => onChange(generatePuzzle(mechanic, nextSeed, difficulty));

    const onJson = (text: string) => {
        setJson(text);
        try {
            onChange(JSON.parse(text));
            setJsonError(null);
        } catch {
            setJsonError("JSON invalide : le plateau n'est pas mis à jour tant que le texte n'est pas corrigé.");
        }
    };

    const puzzleIssues = issues.filter((issue) => issue.path[0] === "puzzle");
    const valid = puzzleIssues.length === 0 && !jsonError && puzzle;
    const copy = MECHANIC_COPY[mechanic];

    return (
        <div className="stack">
            <div className={styles.boardHead}>
                <h3>
                    <span aria-hidden>{copy.glyph}</span> {copy.label}
                </h3>
            </div>

            <div className={styles.generator}>
                <label className={styles.select}>
                    Difficulté
                    <input type="range" min={1} max={10} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} />
                    <output>{difficulty}</output>
                </label>
                <label className={styles.select}>
                    Graine
                    <input className={styles.seed} value={seed} onChange={(e) => setSeed(e.target.value)} maxLength={24} />
                </label>
                <Button onClick={() => generate()}>Générer</Button>
                <Button
                    variant="ghost"
                    onClick={() => {
                        const next = randomSeed();
                        setSeed(next);
                        generate(next);
                    }}
                >
                    Autre plateau
                </Button>
            </div>
            <small className={styles.help}>
                Une même graine donne toujours le même plateau. Génère, joue l&apos;aperçu ci-dessous, puis enregistre.
            </small>

            {puzzleIssues.length > 0 && (
                <ul className={styles.issues}>
                    {puzzleIssues.map((issue) => (
                        <li key={issue.path.join(".") + issue.message}>{issue.message}</li>
                    ))}
                </ul>
            )}

            <section className={styles.preview} aria-label="Aperçu jouable">
                <div className={styles.previewHead}>
                    <span>Aperçu jouable</span>
                    {solvedPreview && <span className={styles.saved}>✓ Résolu</span>}
                </div>
                {valid ? (
                    <PreviewBoard key={json} mechanic={mechanic} puzzle={puzzle as LocalPuzzle} onSolved={() => setSolvedPreview(true)} />
                ) : (
                    <p className={styles.help}>Corrige le plateau pour afficher l&apos;aperçu.</p>
                )}
            </section>

            <details className={styles.jsonBox}>
                <summary>Modifier le plateau à la main (JSON)</summary>
                <textarea value={json} onChange={(e) => onJson(e.target.value)} spellCheck={false} rows={12} aria-label="Plateau au format JSON" />
                {jsonError && <small className={styles.formError}>{jsonError}</small>}
            </details>
        </div>
    );
}

function PreviewBoard({ mechanic, puzzle, onSolved }: { mechanic: LocalMechanic; puzzle: LocalPuzzle; onSolved: () => void }) {
    const report = silentReport(onSolved);
    switch (mechanic) {
        case "MEMORY":
            return <MemoryBoard puzzle={puzzle as MemoryPuzzle} report={report} />;
        case "GEARS":
            return <GearsBoard puzzle={puzzle as GearsPuzzle} report={report} />;
        case "FLOW":
            return <FlowBoard puzzle={puzzle as FlowPuzzle} report={report} />;
        case "ECHOES":
            return <EchoesBoard puzzle={puzzle as EchoesPuzzle} report={report} />;
    }
}
