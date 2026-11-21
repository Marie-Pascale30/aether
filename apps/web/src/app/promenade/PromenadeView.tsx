"use client";

import { useEffect, useMemo, useState } from "react";
import {
    generatePuzzle,
    goalCountOf,
    mentalProfile,
    nextPromenadeMechanic,
    promenadeStart,
    recordPromenadeWin,
    type Faculty,
    type LevelDetail,
    type LocalMechanic,
    type PromenadeState,
    type WorldTheme,
} from "@aether/shared";
import { PuzzleView } from "@/components/puzzle/PuzzleView";
import { Loading } from "@/components/ui/States";
import { MECHANIC_COPY } from "@/lib/kinds";
import { usePlayer } from "@/lib/offline/player";
import { useMe } from "@/lib/queries";

/** Région dont la Promenade emprunte le paysage et la musique, selon la mécanique. */
const THEME: Record<LocalMechanic, WorldTheme> = {
    MEMORY: "bibliotheque",
    GEARS: "atelier",
    FLOW: "observatoire",
    ECHOES: "sommet",
    CHIMES: "conservatoire",
};

const DESCRIPTION: Record<LocalMechanic, string> = {
    MEMORY: "Observe le plateau aussi longtemps qu'il te plaît, puis retrouve où se trouvait chaque symbole.",
    GEARS: "Fais pivoter les conduits pour que la lumière atteigne chaque pièce, sans fuite.",
    FLOW: "Relie chaque paire d'étoiles sans croiser les autres tracés, et éclaire tout le ciel.",
    ECHOES: "Devine la règle derrière les exemples, puis applique-la.",
    CHIMES: "Écoute la phrase des cloches, puis rejoue-la.",
};

const HINTS: Record<LocalMechanic, string[]> = {
    MEMORY: ["Associe chaque symbole à sa rangée, puis à sa colonne.", "Raconte-toi une petite histoire qui relie les symboles."],
    GEARS: ["Pars de la source : chaque conduit doit mener quelque part.", "Les coins et les bords ne laissent que peu d'orientations possibles."],
    FLOW: ["Commence par les étoiles proches l'une de l'autre.", "Le long des bords, il n'y a souvent qu'un seul chemin."],
    ECHOES: ["Compare chaque point de départ à ce qu'il devient.", "Une seule transformation explique tous les exemples."],
    CHIMES: ["Fredonne la phrase dans ta tête avant de la rejouer.", "Repère les cloches par leur symbole : la phrase devient un dessin."],
};

const storageKey = (userId: string) => `aether:promenade:${userId}`;

function load(userId: string): PromenadeState {
    try {
        const stored = localStorage.getItem(storageKey(userId));
        if (stored) return { ...promenadeStart(), ...(JSON.parse(stored) as PromenadeState) };
    } catch {
        // stockage indisponible : la Promenade repart de zéro
    }
    return promenadeStart();
}

function save(userId: string, state: PromenadeState) {
    try {
        localStorage.setItem(storageKey(userId), JSON.stringify(state));
    } catch {
        // la Promenade vaut pour la session
    }
}

/** Une énigme de Promenade, générée sur place à partir de la graine (joueur, nombre d'énigmes résolues). */
function practiceLevel(userId: string, state: PromenadeState, mechanic: LocalMechanic): LevelDetail {
    const seed = `promenade:${userId}:${state.solved}`;
    const puzzle = generatePuzzle(mechanic, seed, state.difficulty[mechanic]);
    const level = { mechanic, kind: "PAIRS" as const, groups: [], puzzle };
    return {
        id: seed,
        world: { slug: "promenade", title: "Promenade", theme: THEME[mechanic] },
        position: 0,
        total: 0,
        title: `${MECHANIC_COPY[mechanic].label} · une énigme pour toi`,
        description: DESCRIPTION[mechanic],
        symbols: [],
        columns: 4,
        mechanic,
        puzzle,
        hints: HINTS[mechanic],
        kind: "PAIRS",
        groups: [],
        groupSize: 0,
        groupCount: goalCountOf(level),
        previousLevelId: null,
        nextLevelId: null,
        isDaily: false,
    };
}

/**
 * La Promenade : des énigmes sans fin, générées sur l'appareil, qui s'ajustent à la façon de jouer
 * et penchent vers la faculté la moins pratiquée. Rien n'est enregistré sur le serveur.
 */
export function PromenadeView() {
    const { data: me } = useMe();
    const { data: player } = usePlayer();
    const [state, setState] = useState<PromenadeState | null>(null);

    useEffect(() => {
        if (me) setState(load(me.id));
    }, [me]);

    // Pratique par faculté (profil mental) : la Promenade propose d'abord ce qui est le moins exercé.
    const practice = useMemo(() => {
        if (!player) return {};
        const profile = mentalProfile(player.bundle, player.records, player.journey);
        return Object.fromEntries(profile.faculties.map((f) => [f.faculty, f.stage])) as Partial<Record<Faculty, number>>;
    }, [player]);

    const mechanic = useMemo(() => (state ? nextPromenadeMechanic(state, practice) : null), [state, practice]);
    const [current, setCurrent] = useState<{ level: LevelDetail; mechanic: LocalMechanic } | null>(null);

    useEffect(() => {
        if (!me || !state || !mechanic) return;
        setCurrent((existing) => existing ?? { level: practiceLevel(me.id, state, mechanic), mechanic });
    }, [me, state, mechanic]);

    if (!me || !state || !current) return <Loading label="Le chemin se dessine…" />;

    return (
        <PuzzleView
            key={current.level.id}
            detail={current.level}
            practice={{
                onSolved: (performance) => {
                    const next = recordPromenadeWin(state, current.mechanic, performance);
                    save(me.id, next);
                    setState(next);
                },
                onNext: () => {
                    const nextMechanic = nextPromenadeMechanic(state, practice);
                    setCurrent({ level: practiceLevel(me.id, state, nextMechanic), mechanic: nextMechanic });
                },
            }}
        />
    );
}

