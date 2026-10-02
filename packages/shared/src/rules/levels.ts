import { GROUP_SIZE } from "../constants";
import type { Group, LevelKind } from "../types";

export interface LevelDefinition {
    kind: LevelKind;
    symbols: readonly string[];
    groups: readonly (readonly number[])[];
}

export interface LevelIssue {
    path: (string | number)[];
    message: string;
}

const KIND_LABEL: Record<LevelKind, string> = { PAIRS: "paire", GROUPS: "groupe", SEQUENCE: "suite" };

export const isOrdered = (kind: LevelKind) => kind === "SEQUENCE";

/** Taille commune des groupes d'une énigme (celle du premier groupe). */
export const groupSizeOf = (level: Pick<LevelDefinition, "groups">) => level.groups[0]?.length ?? 0;

/**
 * Cohérence structurelle d'une énigme :
 *   - tous les groupes ont la même taille, permise pour ce genre (2 pour des paires, 3–4, 3–5) ;
 *   - chaque case désignée existe ;
 *   - une case n'appartient qu'à un seul groupe (sinon l'énigme est insoluble ou ambiguë).
 */
export function validateLevelDefinition(level: LevelDefinition): LevelIssue[] {
    const issues: LevelIssue[] = [];
    const { min, max } = GROUP_SIZE[level.kind];
    const label = KIND_LABEL[level.kind];
    const size = groupSizeOf(level);
    const owner = new Map<number, number>();

    if (size && (size < min || size > max)) {
        const expected = min === max ? `${min} cases` : `entre ${min} et ${max} cases`;
        issues.push({ path: ["groups"], message: `Une ${label} compte ${expected}.` });
    }

    level.groups.forEach((group, g) => {
        if (group.length !== size) {
            issues.push({ path: ["groups", g], message: `La ${label} ${g + 1} n'a pas la même taille que la première (${size} cases).` });
        }
        group.forEach((cell, position) => {
            const path = ["groups", g, position];
            if (cell >= level.symbols.length) {
                issues.push({ path, message: `La ${label} ${g + 1} désigne la case ${cell + 1}, hors du plateau.` });
                return;
            }
            const previous = owner.get(cell);
            if (previous !== undefined) {
                const where = previous === g ? `cette même ${label}` : `la ${label} ${previous + 1}`;
                issues.push({ path, message: `La case ${cell + 1} (« ${level.symbols[cell]} ») appartient déjà à ${where}.` });
                return;
            }
            owner.set(cell, g);
        });
    });

    return issues;
}

/** Les cases choisies forment-elles ce groupe ? Pour une suite, dans l'ordre exact. */
export function matchesGroup(group: readonly number[], cells: readonly number[], ordered: boolean): boolean {
    if (group.length !== cells.length) return false;
    if (ordered) return group.every((cell, i) => cells[i] === cell);
    return group.every((cell) => cells.includes(cell));
}

/** Index du groupe formé par `cells` parmi ceux pas encore trouvés, ou -1. */
export function findGroupIndex(
    groups: readonly (readonly number[])[],
    found: readonly number[],
    cells: readonly number[],
    ordered: boolean,
): number {
    return groups.findIndex((group, i) => !found.includes(i) && matchesGroup(group, cells, ordered));
}

export function groupsAt(groups: readonly Group[], indexes: readonly number[]): Group[] {
    return indexes.flatMap((i) => (groups[i] ? [groups[i]] : []));
}
