import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, MailTo, PUBLISHER } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Mentions légales" };

/** Mentions obligatoires (loi n° 2004-575 du 21 juin 2004, LCEN, art. 6). */
export default function LegalNoticePage() {
    return (
        <LegalPage tag="Informations" title="Mentions légales">
            <section aria-labelledby="ml-editeur">
                <h3 id="ml-editeur">Éditrice du site</h3>
                <p>
                    AETHER est un projet personnel et non commercial, édité par <strong>{PUBLISHER.name}</strong>, particulier.
                    <br />
                    Directrice de la publication : {PUBLISHER.name}.
                    <br />
                    Contact : <MailTo />
                </p>
            </section>

            <section aria-labelledby="ml-hebergement">
                <h3 id="ml-hebergement">Hébergement</h3>
                <ul>
                    <li>
                        <strong>Site web</strong> : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (
                        <a href="https://vercel.com" rel="noopener noreferrer">
                            vercel.com
                        </a>
                        ).
                    </li>
                    <li>
                        <strong>Serveur du jeu (API)</strong> : Render Services, Inc., États-Unis (
                        <a href="https://render.com" rel="noopener noreferrer">
                            render.com
                        </a>
                        ).
                    </li>
                    <li>
                        <strong>Base de données</strong> : Neon, base PostgreSQL hébergée (
                        <a href="https://neon.com" rel="noopener noreferrer">
                            neon.com
                        </a>
                        ).
                    </li>
                </ul>
            </section>

            <section aria-labelledby="ml-donnees">
                <h3 id="ml-donnees">Données personnelles et cookies</h3>
                <p>
                    Le jeu n&apos;utilise qu&apos;un seul cookie, le cookie de session, strictement nécessaire pour te reconnaître : ni
                    publicité, ni mesure d&apos;audience, ni traceur tiers. Tout est détaillé dans la{" "}
                    <Link href="/confidentialite">politique de confidentialité</Link>.
                </p>
            </section>

            <section aria-labelledby="ml-propriete">
                <h3 id="ml-propriete">Propriété intellectuelle</h3>
                <p>
                    Les textes, énigmes, illustrations et sons d&apos;AETHER sont la propriété de leur autrice. Toute reproduction ou
                    réutilisation hors du cadre privé demande son accord préalable.
                </p>
            </section>

            <section aria-labelledby="ml-contact">
                <h3 id="ml-contact">Signaler un contenu ou un problème</h3>
                <p>
                    Pour toute question, demande ou signalement : <MailTo />.
                </p>
            </section>
        </LegalPage>
    );
}
