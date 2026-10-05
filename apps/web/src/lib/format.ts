export { formatDuration } from "@aether/shared";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const plural = (n: number, singular: string, pluralForm = `${singular}s`) =>
    `${n} ${n > 1 ? pluralForm : singular}`;
