"use client";

import { Board } from "@/components/board/Board";
import { ButtonLink, Button } from "@/components/ui/Button";
import { Callout, Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { useElapsed } from "@/hooks/useElapsed";
import { usePuzzle } from "@/hooks/usePuzzle";
import { formatDuration, pad2 } from "@/lib/format";
import { KIND_COPY } from "@/lib/kinds";
import { CompletionPanel } from "./CompletionPanel";
import styles from "./Puzzle.module.css";

export function PuzzleView({ levelId }: { levelId: string }) {
    const puzzle = usePuzzle(levelId);
    const { level, session, completion } = puzzle;
    const elapsed = useElapsed(session?.startedAt, Boolean(session) && !session?.completed);

    if (level.error) return <ErrorState error={level.error} onRetry={() => void level.refetch()} />;
    if (puzzle.startError) return <ErrorState error={puzzle.startError} />;
    if (!level.data || !session) return <Loading label="L'énigme se dessine…" />;

    const detail = level.data;
    const found = session.foundGroups.length;
    const kindCopy = KIND_COPY[detail.kind];

    return (
        <>
            <Panel>
                <header className={styles.head}>
                    <div>
                        <div className={styles.level}>
                            {detail.isDaily
                                ? "ÉNIGME DU JOUR"
                                : `${detail.world.title.toUpperCase()} · ${detail.position > 0 ? `ÉNIGME ${pad2(detail.position)} / ${pad2(detail.total)}` : "APERÇU · BROUILLON"}`}
                        </div>
                        <h2>{detail.title}</h2>
                        <span className={styles.kind}>
                            <span aria-hidden>{kindCopy.glyph}</span> {kindCopy.label}
                            {detail.kind !== "PAIRS" && ` · ${detail.groupSize} éléments`}
                        </span>
                    </div>
                    <dl className={styles.meters}>
                        <div>
                            <dt>Temps</dt>
                            <dd>{formatDuration(completion?.durationMs ?? elapsed)}</dd>
                        </div>
                        <div>
                            <dt>Erreurs</dt>
                            <dd>{session.mistakes}</dd>
                        </div>
                        <div>
                            <dt>Liens</dt>
                            <dd>
                                {found} / {detail.groupCount}
                            </dd>
                        </div>
                    </dl>
                </header>

                <p>{detail.description}</p>

                <section className={styles.hints} aria-label="Indices">
                    {session.hints.map((hint, i) => (
                        <Callout key={i} label={`Indice ${i + 1} :`}>
                            {hint}
                        </Callout>
                    ))}
                    {puzzle.hintsRemaining > 0 && !session.completed && (
                        <div className={styles.hintAsk}>
                            <Button variant="ghost" onClick={puzzle.requestHint} disabled={puzzle.hintPending}>
                                ✧ Demander un indice ({puzzle.hintsRemaining})
                            </Button>
                            <small>Un indice limite la note à ★★, deux à ★.</small>
                        </div>
                    )}
                </section>

                <Board
                    symbols={detail.symbols}
                    columns={detail.columns}
                    selected={puzzle.selected}
                    linked={session.foundGroups}
                    rejected={puzzle.rejected}
                    ordered={puzzle.ordered}
                    disabled={puzzle.busy}
                    onPick={puzzle.pick}
                />

                <div className={styles.status} data-tone={puzzle.status.tone} role="status" aria-live="polite">
                    {puzzle.status.text}
                </div>

                <div className={styles.actions}>
                    <Button variant="ghost" onClick={puzzle.restart} disabled={puzzle.restarting}>
                        ↺ Recommencer
                    </Button>
                    <ButtonLink href={detail.isDaily ? "/quotidien" : `/mondes/${detail.world.slug}`} variant="ghost">
                        {detail.isDaily ? "Énigme du jour" : detail.world.title}
                    </ButtonLink>
                </div>
            </Panel>

            {completion && (
                <CompletionPanel
                    completion={completion}
                    worldSlug={detail.world.slug}
                    onReplay={puzzle.restart}
                    onClose={puzzle.dismissCompletion}
                />
            )}
        </>
    );
}
