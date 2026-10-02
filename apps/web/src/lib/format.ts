export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 65 000 ms → « 1:05 » ; au-delà d'une heure → « 1:02:05 ». */
export function formatDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${minutes}:${pad2(seconds)}`;
}

export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
    `${n} ${n > 1 ? pluralForm : singular}`;
