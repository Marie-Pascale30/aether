import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, MailTo, PUBLISHER } from "@/components/legal/LegalPage";
import styles from "@/components/legal/Legal.module.css";

export const metadata: Metadata = { title: "Politique de confidentialité" };

/** Information des joueurs (RGPD, art. 13). À tenir à jour avec le code (durées, prestataires, cookie). */
export default function PrivacyPage() {
    return (
        <LegalPage tag="Tes données" title="Politique de confidentialité">
            <p>
                AETHER est un jeu d&apos;énigmes pensé pour être paisible, y compris avec tes données : on ne collecte que ce qui sert
                à jouer et à garder ta progression. Pas de publicité, pas de mesure d&apos;audience, pas de revente.
            </p>

            <section aria-labelledby="pc-responsable">
                <h3 id="pc-responsable">Qui est responsable de tes données ?</h3>
                <p>
                    {PUBLISHER.name}, particulier, qui édite AETHER à titre personnel. Pour toute question ou demande : <MailTo />.
                </p>
            </section>

            <section aria-labelledby="pc-donnees">
                <h3 id="pc-donnees">Quelles données ?</h3>
                <ul>
                    <li>
                        <strong>En invité</strong> (sans e-mail) : un identifiant technique tiré au hasard, un pseudo attribué
                        automatiquement (« Voyageur 1234 »), les dates de création et de dernière activité.
                    </li>
                    <li>
                        <strong>Avec un compte</strong> : ton pseudo, ton adresse e-mail (facultative : tu peux jouer sans), la date de
                        confirmation de l&apos;adresse et ton mot de passe, conservé uniquement sous forme d&apos;empreinte chiffrée
                        (scrypt) : personne ne peut le lire.
                    </li>
                    <li>
                        <strong>Ta progression</strong> : énigmes résolues, pétales, temps, erreurs et indices utilisés, résultats de
                        l&apos;énigme du jour, repères atteints, et pour les énigmes de Liens les coups joués (qui servent, regroupés, à
                        améliorer les énigmes).
                    </li>
                    <li>
                        <strong>Données techniques</strong> : journaux du serveur (adresse de la page appelée, code de réponse,
                        identifiant de joueur) et rapports d&apos;erreur du navigateur (message d&apos;erreur et adresse de la page, sans
                        ses paramètres). Ton adresse IP sert, en mémoire et pendant une heure au plus, à limiter les abus ; nos
                        hébergeurs la consignent aussi dans leurs journaux d&apos;accès.
                    </li>
                </ul>
                <p>
                    Le pseudo est visible de toi seul·e : il n&apos;y a pas de classement public. Choisis-en un qui ne soit pas ton vrai
                    nom.
                </p>
            </section>

            <section aria-labelledby="pc-finalites">
                <h3 id="pc-finalites">Pourquoi, et sur quelle base légale ?</h3>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col">Finalité</th>
                                <th scope="col">Base légale (RGPD, art. 6)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Faire fonctionner le jeu, sauvegarder ta progression, gérer ton compte et ta session</td>
                                <td>Exécution du service que tu demandes (contrat)</td>
                            </tr>
                            <tr>
                                <td>E-mails liés au compte : confirmation d&apos;adresse, mot de passe oublié</td>
                                <td>Exécution du service que tu demandes (contrat)</td>
                            </tr>
                            <tr>
                                <td>Sécurité : limitation des tentatives, journaux, correction des erreurs</td>
                                <td>Intérêt légitime (protéger le jeu et ses joueurs)</td>
                            </tr>
                            <tr>
                                <td>Améliorer les énigmes grâce aux statistiques regroupées des coups joués</td>
                                <td>Intérêt légitime (tu peux t&apos;y opposer en écrivant à l&apos;adresse ci-dessous)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section aria-labelledby="pc-durees">
                <h3 id="pc-durees">Combien de temps ?</h3>
                <ul>
                    <li>
                        <strong>Joueur invité</strong> : effacé automatiquement, avec toute sa progression, après 30 jours sans
                        activité.
                    </li>
                    <li>
                        <strong>Compte</strong> : tant que tu le gardes. Tu peux le supprimer à tout moment depuis les{" "}
                        <Link href="/reglages">Réglages</Link> : tout est effacé immédiatement.
                    </li>
                    <li>
                        <strong>Liens envoyés par e-mail</strong> : valables 48 heures (confirmation d&apos;adresse) ou 1 heure (mot de
                        passe oublié), puis supprimés 7 jours après leur expiration ou leur utilisation.
                    </li>
                    <li>
                        <strong>Session</strong> : 30 jours au plus ; elle prend fin dès que tu te déconnectes.
                    </li>
                    <li>
                        <strong>Journaux techniques</strong> : quelques jours, selon les durées de conservation des hébergeurs.
                    </li>
                </ul>
            </section>

            <section aria-labelledby="pc-destinataires">
                <h3 id="pc-destinataires">Qui y a accès ?</h3>
                <p>
                    Seule l&apos;éditrice du jeu. Les données sont hébergées par des prestataires techniques, qui les traitent pour son
                    compte et uniquement pour cela :
                </p>
                <ul>
                    <li>Vercel Inc. (États-Unis) : le site web ;</li>
                    <li>Render Services, Inc. (États-Unis) : le serveur du jeu ;</li>
                    <li>Neon : la base de données.</li>
                </ul>
                <p>
                    Ces prestataires peuvent traiter des données aux États-Unis. Ces transferts sont encadrés par les garanties
                    prévues par le RGPD (clauses contractuelles types de la Commission européenne et, pour les prestataires certifiés,
                    le cadre de protection des données UE–États-Unis).
                </p>
                <p>
                    <strong>E-mails</strong> : à ce jour, aucun prestataire d&apos;envoi d&apos;e-mails n&apos;est utilisé et aucun
                    e-mail ne part réellement. Les messages de confirmation ou de réinitialisation sont seulement enregistrés sur le
                    serveur du jeu, puis effacés à son redémarrage. Si un service d&apos;envoi est ajouté, cette page le nommera.
                </p>
            </section>

            <section aria-labelledby="pc-cookies">
                <h3 id="pc-cookies">Cookie et stockage sur ton appareil</h3>
                <p>
                    Un seul cookie : <code>aether_session</code>, qui te garde connecté·e (30 jours au plus, illisible par les scripts
                    de la page). Il est strictement nécessaire au fonctionnement du jeu : il ne demande donc pas ton accord, et aucun
                    autre cookie n&apos;est déposé (ni publicité, ni mesure d&apos;audience). Les polices sont servies par le site
                    lui-même : aucune requête vers Google.
                </p>
                <p>
                    Le jeu garde aussi sur ton appareil (stockage local du navigateur) tes réglages, tes notes de carnet, le contenu
                    des énigmes et les victoires en attente d&apos;envoi, pour jouer hors ligne. Dans les applications, le jeton de
                    session y est rangé à la place du cookie. Ces données ne quittent pas ton appareil, sauf tes victoires, envoyées
                    pour sauvegarder ta progression.
                </p>
            </section>

            <section aria-labelledby="pc-droits">
                <h3 id="pc-droits">Tes droits</h3>
                <p>Tu peux à tout moment :</p>
                <ul>
                    <li>
                        <strong>accéder à tes données et les emporter</strong> : bouton « Exporter mes données » dans les{" "}
                        <Link href="/reglages">Réglages</Link> (fichier JSON) ;
                    </li>
                    <li>
                        <strong>les corriger</strong> : ton pseudo se change depuis ton <Link href="/profil">profil</Link> ;
                    </li>
                    <li>
                        <strong>les effacer</strong> : « Supprimer mon compte » dans les <Link href="/reglages">Réglages</Link> ;
                    </li>
                    <li>
                        <strong>t&apos;opposer à un traitement ou demander sa limitation</strong>, ou poser toute question : écris à{" "}
                        <MailTo />. Une réponse t&apos;est apportée dans un délai d&apos;un mois.
                    </li>
                </ul>
                <p>
                    Si tu estimes que tes droits ne sont pas respectés, tu peux adresser une réclamation à la CNIL (
                    <a href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer">
                        cnil.fr
                    </a>
                    ).
                </p>
            </section>

            <section aria-labelledby="pc-mineurs">
                <h3 id="pc-mineurs">Si tu as moins de 15 ans</h3>
                <p>
                    Tu peux jouer en invité, sans donner d&apos;adresse e-mail. Pour créer un compte, demande d&apos;abord l&apos;accord
                    d&apos;un parent (ou de la personne qui s&apos;occupe de toi) et lisez cette page ensemble. Choisis un pseudo qui
                    n&apos;est pas ton vrai nom. Un parent peut demander à tout moment la suppression du compte en écrivant à <MailTo />.
                </p>
            </section>

            <section aria-labelledby="pc-securite">
                <h3 id="pc-securite">Sécurité</h3>
                <p>
                    Connexions chiffrées (HTTPS), mots de passe jamais stockés en clair, cookie de session protégé, tentatives de
                    connexion limitées. Voir aussi les <Link href="/mentions-legales">mentions légales</Link>.
                </p>
            </section>
        </LegalPage>
    );
}
