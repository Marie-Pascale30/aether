"use client";

import Link from "next/link";
import { GROWTH, mentalProfile, type FacultyState, type MindSuggestion } from "@aether/shared";
import { Panel } from "@/components/ui/Panel";
import { usePlayer } from "@/lib/offline/player";
import { levelHref } from "@/lib/routes";
import styles from "./MindProfile.module.css";

/**
 * Le profil mental : comment chaque faculté se déploie, dit avec des mots et une pousse qui
 * grandit — jamais un nombre, jamais une note. Il propose de quoi garder l'esprit en équilibre.
 */
export function MindProfile() {
    const { data } = usePlayer();
    if (!data) return null;
    const profile = mentalProfile(data.bundle, data.records, data.journey);

    return (
        <Panel>
            <div className="tag">Profil mental</div>
            <h2>Ton esprit</h2>
            <p className="muted">Chaque faculté pousse à son rythme. Il n&apos;y a rien à atteindre : seulement de quoi prendre soin.</p>
            <ul className={styles.faculties}>
                {profile.faculties.map((faculty) => (
                    <li key={faculty.faculty}>
                        <FacultyTile faculty={faculty} />
                    </li>
                ))}
            </ul>
            {profile.suggestion && <BalanceSuggestion suggestion={profile.suggestion} />}
        </Panel>
    );
}

/** Suggestion d'équilibre, seule : pour la carte de l'Atlas. */
export function MindBalance() {
    const { data } = usePlayer();
    if (!data) return null;
    const { suggestion } = mentalProfile(data.bundle, data.records, data.journey);
    return suggestion ? <BalanceSuggestion suggestion={suggestion} /> : null;
}

function BalanceSuggestion({ suggestion }: { suggestion: MindSuggestion }) {
    return (
        <p className={styles.suggestion}>
            <span aria-hidden>☯</span>
            <span>
                Pour garder l&apos;équilibre, ta <strong>{suggestion.label.toLowerCase()}</strong> aimerait un peu d&apos;attention :{" "}
                <Link href={levelHref(suggestion.levelId)}>
                    {suggestion.levelTitle} · {suggestion.worldTitle}
                </Link>
            </span>
        </p>
    );
}

function FacultyTile({ faculty }: { faculty: FacultyState }) {
    return (
        <article className={styles.tile} data-stage={faculty.stage}>
            <Sprout stage={faculty.stage} />
            <div>
                <h3>{faculty.label}</h3>
                <p>{capitalize(faculty.growth)}</p>
            </div>
        </article>
    );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Une pousse qui grandit d'un stade à l'autre (la forme parle, pas un chiffre). */
function Sprout({ stage }: { stage: number }) {
    const top = GROWTH.length - 1;
    return (
        <svg className={styles.sprout} viewBox="0 0 40 48" aria-hidden>
            <path d="M6 44 H34" className={styles.soil} />
            {stage === 0 ? (
                <circle cx="20" cy="41" r="3" className={styles.seed} />
            ) : (
                <>
                    <path d={`M20 44 V${44 - stage * 7}`} className={styles.stem} />
                    {stage >= 1 && <ellipse cx="14" cy="38" rx="6" ry="3" transform="rotate(-25 14 38)" className={styles.leaf} />}
                    {stage >= 2 && <ellipse cx="26" cy="32" rx="6" ry="3" transform="rotate(25 26 32)" className={styles.leaf} />}
                    {stage >= 3 && <ellipse cx="14" cy="25" rx="6" ry="3" transform="rotate(-25 14 25)" className={styles.leaf} />}
                    {stage >= top && (
                        <g className={styles.bloom}>
                            {[0, 72, 144, 216, 288].map((angle) => (
                                <ellipse key={angle} cx="20" cy="10" rx="3" ry="5" transform={`rotate(${angle} 20 14)`} />
                            ))}
                            <circle cx="20" cy="14" r="2.4" className={styles.heart} />
                        </g>
                    )}
                </>
            )}
        </svg>
    );
}
