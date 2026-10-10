import type { ContentBundle, LevelKind } from "../types";
import type { Mechanic } from "../mechanics";
import { petalCount } from "./scoring";
import type { JourneyView, ProgressRecords } from "./journey";

/** Les facultés de l'esprit que l'Atlas exerce (la sagesse du Sommet les réunit toutes). */
export const FACULTIES = ["observation", "memoire", "logique", "espace", "rythme", "associations"] as const;
export type Faculty = (typeof FACULTIES)[number];

export const FACULTY_LABELS: Record<Faculty, string> = {
    observation: "Observation",
    memoire: "Mémoire",
    logique: "Logique",
    espace: "Vision spatiale",
    rythme: "Rythme",
    associations: "Associations",
};

/** Faculté qu'exerce une énigme, d'après sa mécanique (et, pour les Liens, son genre). */
export function facultyOf(level: { mechanic: Mechanic; kind: LevelKind }): Faculty {
    switch (level.mechanic) {
        case "MEMORY":
            return "memoire";
        case "GEARS":
        case "ECHOES":
            return "logique";
        case "FLOW":
            return "espace";
        case "LINKS":
            return level.kind === "SEQUENCE" ? "rythme" : level.kind === "GROUPS" ? "associations" : "observation";
    }
}

/**
 * Stades de croissance d'une faculté. Ce sont des mots, jamais des notes : le profil mental
 * raconte comment l'esprit se déploie, il ne le mesure pas.
 */
export const GROWTH = ["en sommeil", "s'éveille", "grandit", "s'épanouit", "rayonne"] as const;
export type Growth = (typeof GROWTH)[number];

/** Pratique nécessaire pour atteindre chaque stade (énigmes résolues, un peu plus avec l'harmonie). */
const GROWTH_AT = [0, 1, 3, 6, 10];

export interface FacultyState {
    faculty: Faculty;
    label: string;
    /** Stade de 0 (en sommeil) à 4 (rayonne). */
    stage: number;
    growth: Growth;
}

export interface MindSuggestion {
    faculty: Faculty;
    label: string;
    levelId: string;
    levelTitle: string;
    worldTitle: string;
}

export interface MentalProfile {
    faculties: FacultyState[];
    /** Énigme ouverte qui exercerait la faculté la moins pratiquée (pour garder l'équilibre). */
    suggestion: MindSuggestion | null;
}

/**
 * Profil mental, calculé sur l'appareil : pour chaque faculté, un stade de croissance d'après
 * les énigmes résolues (les pétales d'autonomie et de clarté y ajoutent un peu), et une
 * suggestion douce pour équilibrer l'esprit plutôt que de le spécialiser.
 */
export function mentalProfile(bundle: ContentBundle, records: ProgressRecords, journey: JourneyView): MentalProfile {
    const practice = new Map<Faculty, number>(FACULTIES.map((faculty) => [faculty, 0]));
    const openLevel = new Map<Faculty, MindSuggestion>();

    for (const world of bundle.worlds) {
        for (const level of world.levels) {
            const faculty = facultyOf(level);
            const record = records.get(level.id);
            if (record) practice.set(faculty, practice.get(faculty)! + 1 + 0.25 * (petalCount(record.petals) - 1));
            else if (!openLevel.has(faculty) && journey.status(level.id) === "available") {
                openLevel.set(faculty, { faculty, label: FACULTY_LABELS[faculty], levelId: level.id, levelTitle: level.title, worldTitle: world.title });
            }
        }
    }

    const faculties = FACULTIES.map((faculty): FacultyState => {
        const amount = practice.get(faculty)!;
        const stage = GROWTH_AT.filter((threshold) => amount >= threshold).length - 1;
        return { faculty, label: FACULTY_LABELS[faculty], stage, growth: GROWTH[stage]! };
    });

    // La faculté la moins pratiquée parmi celles qu'une énigme ouverte peut exercer.
    const candidates = FACULTIES.filter((faculty) => openLevel.has(faculty)).sort((a, b) => practice.get(a)! - practice.get(b)!);
    const least = candidates[0];
    const balanced = least === undefined || candidates.every((faculty) => practice.get(faculty) === practice.get(least));
    return { faculties, suggestion: least && !balanced ? openLevel.get(least)! : null };
}
