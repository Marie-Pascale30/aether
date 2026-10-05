import type { Mail } from "./mail.service";

const escape = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Gabarit commun : texte brut (lisible partout) et HTML sobre aux couleurs du jeu. */
function layout(to: string, subject: string, paragraphs: string[], action: { label: string; url: string }, footer: string): Mail {
    const text = [...paragraphs, "", `${action.label} : ${action.url}`, "", footer].join("\n");
    const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#07131b;font-family:system-ui,sans-serif;color:#edf1df">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<div style="color:#d9bd72;letter-spacing:.3em;font-size:13px;font-weight:700">AETHER</div>
${paragraphs.map((p) => `<p style="line-height:1.6;color:#cbd8d3">${escape(p)}</p>`).join("\n")}
<p style="margin:28px 0"><a href="${escape(action.url)}" style="background:#d9bd72;color:#132019;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;display:inline-block">${escape(action.label)}</a></p>
<p style="font-size:12px;color:#6f8983;line-height:1.6">${escape(footer)}<br>Lien direct : ${escape(action.url)}</p>
</div></body></html>`;
    return { to, subject, text, html };
}

export function verifyEmailMail(to: string, displayName: string, url: string): Mail {
    return layout(
        to,
        "Confirme ton adresse e-mail",
        [`Bonjour ${displayName},`, "Bienvenue parmi les gardiens d'AETHER. Confirme ton adresse pour sécuriser ton compte et pouvoir récupérer ton mot de passe."],
        { label: "Confirmer mon adresse", url },
        "Ce lien est valable 48 heures. Si tu n'as pas créé de compte, ignore ce message.",
    );
}

export function resetPasswordMail(to: string, displayName: string, url: string): Mail {
    return layout(
        to,
        "Réinitialise ton mot de passe",
        [`Bonjour ${displayName},`, "Une demande de nouveau mot de passe a été faite pour ton compte AETHER."],
        { label: "Choisir un nouveau mot de passe", url },
        "Ce lien est valable 1 heure et ne sert qu'une fois. Si tu n'es pas à l'origine de la demande, ignore ce message : ton mot de passe ne change pas.",
    );
}
