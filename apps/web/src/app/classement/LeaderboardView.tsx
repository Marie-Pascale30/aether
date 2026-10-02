"use client";

import type { LeaderboardEntry } from "@aether/shared";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ErrorState, Loading } from "@/components/ui/States";
import { formatDuration } from "@/lib/format";
import { useLeaderboard, useMe } from "@/lib/queries";
import styles from "./classement.module.css";

export function LeaderboardView() {
    const board = useLeaderboard(20);
    const { data: me } = useMe();

    if (board.error) return <ErrorState error={board.error} onRetry={() => void board.refetch()} />;
    if (!board.data) return <Loading />;

    const { entries, me: myEntry } = board.data;
    const meOutsideTop = myEntry && !entries.some((entry) => entry.userId === myEntry.userId);

    return (
        <Panel>
            <div className="tag">Gardiens du jardin</div>
            <h2>Classement</h2>
            <p>Étoiles cumulées sur toutes les énigmes. À égalité, le plus d&apos;énigmes résolues, puis les meilleurs temps.</p>

            {entries.length === 0 ? (
                <p>Personne n&apos;a encore inscrit son nom. Le jardin attend son premier gardien.</p>
            ) : (
                <div className={styles.scroll}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Rang</th>
                                <th scope="col">Gardien</th>
                                <th scope="col">★</th>
                                <th scope="col">Énigmes</th>
                                <th scope="col">Temps cumulé</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <Row key={entry.userId} entry={entry} isMe={entry.userId === me?.id} />
                            ))}
                            {meOutsideTop && (
                                <>
                                    <tr className={styles.gap} aria-hidden>
                                        <td colSpan={5}>⋯</td>
                                    </tr>
                                    <Row entry={myEntry} isMe />
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {me?.isGuest && (
                <div className={styles.invite}>
                    <p>Tu joues en invité : crée un compte pour apparaître ici. Ta progression est conservée.</p>
                    <ButtonLink href="/inscription" variant="primary">
                        Créer un compte
                    </ButtonLink>
                </div>
            )}
        </Panel>
    );
}

function Row({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
    return (
        <tr data-me={isMe || undefined}>
            <td className={styles.rank}>{entry.rank <= 3 ? ["✦", "✧", "⋆"][entry.rank - 1] : entry.rank}</td>
            <td>
                {entry.displayName}
                {isMe && <span className={styles.you}> (toi)</span>}
            </td>
            <td>{entry.totalStars}</td>
            <td>{entry.completedLevels}</td>
            <td>{formatDuration(entry.totalTimeMs)}</td>
        </tr>
    );
}
