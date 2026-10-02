import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function NotFound() {
    return (
        <Panel style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}>
            <div className="tag">Sentier perdu</div>
            <h2>Rien ne pousse ici</h2>
            <p style={{ marginInline: "auto" }}>Cette page n&apos;existe pas, ou plus.</p>
            <ButtonLink href="/" variant="primary">
                Retour à l&apos;accueil
            </ButtonLink>
        </Panel>
    );
}
