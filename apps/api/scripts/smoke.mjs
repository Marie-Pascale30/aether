// Test de bout en bout contre une API démarrée (et une base seedée) :
//   npm run smoke -w @aether/api            (API_URL=http://localhost:4100/api par défaut)
// Parcourt : invité → mondes et verrous → énigme 1 (erreur, indice, résolution) → inscription
// → classement → fusion de progression → admin (groupes, suites, mondes, éditeur).
// Les réponses vérifiées sont celles du seed (prisma/seed.ts).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
const API = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4100}/api`;

/**
 * Client minimal qui conserve le cookie de session, comme un navigateur. Chaque client a sa
 * propre IP (X-Forwarded-For, que l'API accepte du proxy local) : la limitation de débit
 * le traite comme un joueur distinct, comme en vrai.
 */
function client() {
    let cookie = "";
    const ip = `10.${[0, 0, 0].map(() => Math.floor(Math.random() * 254) + 1).join(".")}`;
    return async function call(method, path, body) {
        const res = await fetch(API + path, {
            method,
            headers: { "content-type": "application/json", "x-forwarded-for": ip, ...(cookie && { cookie }) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
    };
}

let step = 0;
async function check(label, fn) {
    await fn();
    console.log(`  ✓ ${String(++step).padStart(2, "0")} ${label}`);
}

const player = client();
const unique = Date.now().toString(36);
const attempt = (who, sessionId, cells) => who("POST", `/sessions/${sessionId}/attempts`, { cells });
let worlds, origines, session;

console.log(`Smoke test sur ${API}`);

await check("santé", async () => {
    assert.equal((await player("GET", "/health")).status, 200);
});

await check("observabilité : identifiant de requête, erreurs en français, rapport navigateur", async () => {
    const res = await player("GET", "/route-inexistante");
    assert.equal(res.status, 404);
    assert.equal(res.body.message, "Cette route n'existe pas.");
    assert.match(res.headers.get("x-request-id") ?? "", /^[\w-]{8,}$/);
    assert.equal(res.body.requestId, res.headers.get("x-request-id"));
    const report = { kind: "error", message: "smoke: erreur simulée", url: "http://localhost/smoke" };
    assert.equal((await player("POST", "/client-errors", report)).status, 204);
    assert.equal((await player("POST", "/client-errors", { kind: "autre" })).status, 400);
});

await check("sans session : /auth/me vaut null, routes de jeu → 401", async () => {
    assert.deepEqual((await player("GET", "/auth/me")).body, { me: null });
    assert.equal((await player("GET", "/worlds")).status, 401);
});

await check("session invité", async () => {
    const { status, body } = await player("POST", "/auth/guest");
    assert.equal(status, 201);
    assert.equal(body.isGuest, true);
});

await check("mondes : le premier ouvert, les suivants scellés", async () => {
    worlds = (await player("GET", "/worlds")).body;
    assert.ok(worlds.length >= 3);
    assert.deepEqual(worlds.map((w) => w.status).slice(0, 3), ["available", "locked", "locked"]);
    assert.equal(worlds[0].garden.stage, 0);
    origines = (await player("GET", `/worlds/${worlds[0].slug}`)).body;
    assert.equal(origines.levels[0].status, "available");
    assert.equal(origines.levels[1].status, "locked");
    assert.equal(origines.nextLevelId, origines.levels[0].id);
});

await check("énigmes : réponses jamais exposées, énigme scellée → 403 (y compris dans un monde scellé)", async () => {
    const detail = (await player("GET", `/levels/${origines.levels[0].id}`)).body;
    assert.equal(detail.groups, undefined);
    assert.equal(detail.kind, "PAIRS");
    assert.equal(detail.groupSize, 2);
    assert.equal(detail.world.slug, worlds[0].slug);
    assert.equal((await player("GET", `/levels/${origines.levels[1].id}`)).status, 403);
    const foret = (await player("GET", `/worlds/${worlds[1].slug}`)).body;
    assert.equal(foret.levels[0].status, "locked");
    assert.equal((await player("GET", `/levels/${foret.levels[0].id}`)).status, 403);
});

await check("démarrer puis reprendre la même partie", async () => {
    session = (await player("POST", `/levels/${origines.levels[0].id}/sessions`, {})).body;
    const again = (await player("POST", `/levels/${origines.levels[0].id}/sessions`, {})).body;
    assert.equal(again.sessionId, session.sessionId);
});

await check("validations : même case, case hors plateau, mauvais nombre de cases", async () => {
    assert.equal((await attempt(player, session.sessionId, [1, 1])).status, 400);
    assert.equal((await attempt(player, session.sessionId, [0, 99])).status, 400);
    assert.equal((await attempt(player, session.sessionId, [0, 1, 2])).status, 400);
});

await check("mauvaise paire → erreur comptée", async () => {
    const { body } = await attempt(player, session.sessionId, [0, 1]);
    assert.equal(body.result, "mismatch");
    assert.equal(body.mistakes, 1);
});

await check("indices révélés un par un, puis épuisés", async () => {
    const first = (await player("POST", `/sessions/${session.sessionId}/hints`)).body;
    assert.equal(first.hints.length, 1);
    const second = (await player("POST", `/sessions/${session.sessionId}/hints`)).body;
    assert.equal(second.hintsRemaining, 0);
    assert.equal((await player("POST", `/sessions/${session.sessionId}/hints`)).status, 400);
});

await check("bonne paire (dans l'ordre inverse) → énigme résolue, 1 étoile", async () => {
    // Seed : énigme 1 = cases 0 et 3.
    const { body } = await attempt(player, session.sessionId, [3, 0]);
    assert.equal(body.result, "match");
    assert.ok(body.completion);
    assert.equal(body.completion.stars, 1);
    assert.equal(body.completion.isNewBest, true);
    assert.equal(body.completion.nextLevelId, origines.levels[1].id);
    assert.equal(body.completion.worldCompleted, false);
    assert.equal(body.completion.garden.completedLevels, 1);
    assert.equal((await attempt(player, session.sessionId, [0, 3])).status, 409);
});

await check("rejouer parfaitement → 3 étoiles, nouveau record", async () => {
    const replay = (await player("POST", `/levels/${origines.levels[0].id}/sessions`, {})).body;
    const { body } = await attempt(player, replay.sessionId, [0, 3]);
    assert.equal(body.completion.stars, 3);
    assert.equal(body.completion.isNewBest, true);
});

await check("énigme 2 débloquée, progression et stats à jour", async () => {
    const after = (await player("GET", `/worlds/${worlds[0].slug}`)).body;
    assert.equal(after.levels[0].status, "completed");
    assert.equal(after.levels[0].bestStars, 3);
    assert.equal(after.levels[1].status, "available");
    assert.equal(after.stars, 3);
    const progress = (await player("GET", "/me/progress")).body;
    assert.equal(progress.completedLevels, 1);
    assert.equal(progress.resume.world.slug, worlds[0].slug);
    assert.equal(progress.resume.levelId, origines.levels[1].id);
    const stats = (await player("GET", "/me/stats")).body;
    assert.equal(stats.levels[0].completions, 2);
    assert.equal(stats.levels[0].worldTitle, worlds[0].title);
    assert.equal(stats.totals.mistakes, 1);
});

await check("invité absent du classement", async () => {
    const board = (await player("GET", "/leaderboard")).body;
    assert.equal(board.me, null);
});

await check("inscription : l'invité garde sa progression", async () => {
    const bad = await player("POST", "/auth/register", { displayName: "x", email: "pas-un-email", password: "court" });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.issues.length >= 3);

    const { status, body } = await player("POST", "/auth/register", {
        displayName: `Testeur ${unique}`,
        email: `smoke-${unique}@aether.local`,
        password: "motdepasse-solide",
    });
    assert.equal(status, 201);
    assert.equal(body.isGuest, false);
    assert.equal((await player("GET", `/worlds/${worlds[0].slug}`)).body.levels[0].status, "completed");
});

await check("apparaît au classement une fois inscrit", async () => {
    const board = (await player("GET", "/leaderboard?limit=5")).body;
    assert.ok(board.me);
    assert.equal(board.me.totalStars, 3);
});

await check("connexion depuis un nouvel invité : progression fusionnée", async () => {
    const other = client();
    await other("POST", "/auth/guest");
    const wrong = await other("POST", "/auth/login", { email: `smoke-${unique}@aether.local`, password: "faux" });
    assert.equal(wrong.status, 401);
    const { status } = await other("POST", "/auth/login", {
        email: `smoke-${unique}@aether.local`,
        password: "motdepasse-solide",
    });
    assert.equal(status, 200);
    assert.equal((await other("GET", `/worlds/${worlds[0].slug}`)).body.levels[0].status, "completed");
});

/** Dernier lien reçu par e-mail à cette adresse (MAIL_TRANSPORT=log : boîte d'envoi locale). */
function lastMailToken(email, kind) {
    const dir = ".mail-outbox";
    const slug = email.replace(/[^a-z0-9]+/gi, "_");
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(`-${slug}.json`)).sort() : [];
    const mails = files.map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8"))).filter((m) => m.text.includes(kind));
    return mails.at(-1)?.text.match(/token=([\w-]+)/)?.[1] ?? null;
}

await check("adresse e-mail : lien de vérification envoyé, à usage unique", async () => {
    const email = `smoke-${unique}@aether.local`;
    assert.equal((await player("GET", "/auth/me")).body.me.emailVerified, false);
    const token = lastMailToken(email, "/verifier-email");
    assert.ok(token, "aucun e-mail de vérification dans .mail-outbox");
    const verified = await player("POST", "/auth/email/verify", { token });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.emailVerified, true);
    assert.equal((await player("POST", "/auth/email/verify", { token })).status, 400);
});

await check("mot de passe oublié : réponse muette, lien à usage unique, autres sessions fermées", async () => {
    const email = `smoke-${unique}@aether.local`;
    const other = client();
    await other("POST", "/auth/login", { email, password: "motdepasse-solide" });
    assert.ok((await other("GET", "/auth/me")).body.me);

    assert.equal((await client()("POST", "/auth/password/forgot", { email: `inconnu-${unique}@aether.local` })).status, 204);
    assert.equal((await client()("POST", "/auth/password/forgot", { email })).status, 204);
    const token = lastMailToken(email, "/reinitialiser");
    assert.ok(token, "aucun e-mail de réinitialisation");

    const visitor = client();
    assert.equal((await visitor("POST", "/auth/password/reset", { token, password: "court" })).status, 400);
    const reset = await visitor("POST", "/auth/password/reset", { token, password: "nouveau-mot-de-passe" });
    assert.equal(reset.status, 200);
    assert.equal((await visitor("POST", "/auth/password/reset", { token, password: "encore-un-autre" })).status, 400);

    assert.equal((await other("GET", "/auth/me")).body.me, null, "l'ancienne session devait être fermée");
    assert.equal((await client()("POST", "/auth/login", { email, password: "motdepasse-solide" })).status, 401);
    assert.equal((await client()("POST", "/auth/login", { email, password: "nouveau-mot-de-passe" })).status, 200);
});

await check("changer de mot de passe depuis le profil", async () => {
    const email = `smoke-${unique}@aether.local`;
    const me = client();
    await me("POST", "/auth/login", { email, password: "nouveau-mot-de-passe" });
    const wrong = await me("PATCH", "/auth/password", { currentPassword: "faux", newPassword: "troisieme-mot-de-passe" });
    assert.equal(wrong.status, 400);
    assert.deepEqual(wrong.body.issues[0].path, ["currentPassword"]);
    const ok = await me("PATCH", "/auth/password", { currentPassword: "nouveau-mot-de-passe", newPassword: "troisieme-mot-de-passe" });
    assert.equal(ok.status, 200);
    assert.ok((await me("GET", "/auth/me")).body.me, "la session courante doit survivre au changement");

    // La réinitialisation a fermé la session du joueur principal de ce test : il se reconnecte.
    assert.equal((await player("GET", "/auth/me")).body.me, null);
    assert.equal((await player("POST", "/auth/login", { email, password: "troisieme-mot-de-passe" })).status, 200);
});

await check("éditeur réservé aux administrateurs", async () => {
    assert.equal((await player("GET", "/admin/levels")).status, 403);
    assert.equal((await player("GET", "/admin/worlds")).status, 403);
});

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const admin = client();
    let foret, rivage;

    await check("admin : connexion, aperçu d'énigmes scellées", async () => {
        const login = await admin("POST", "/auth/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
        assert.equal(login.status, 200);
        foret = (await admin("GET", `/worlds/${worlds[1].slug}`)).body;
        rivage = (await admin("GET", `/worlds/${worlds[2].slug}`)).body;
        assert.equal((await admin("GET", `/levels/${foret.levels[0].id}`)).status, 200);
    });

    await check("statistiques de conception : fausses pistes et parties admin exclues", async () => {
        const stats = (await admin("GET", `/admin/levels/${origines.levels[0].id}/stats`)).body;
        assert.ok(stats.sessions >= 2);
        assert.ok(stats.completions >= 2);
        assert.ok(stats.attempts >= 3);
        // Le joueur a tenté [0, 1] plus haut ; la combinaison est triée (paires : ordre indifférent).
        const lead = stats.falseLeads.find((l) => l.cells.join() === "0,1");
        assert.ok(lead, "fausse piste [0, 1] absente");
        assert.deepEqual(lead.symbols, ["○", "✦"]);
        assert.deepEqual(stats.stars.map((s) => s.stars), [3, 2, 1]);
        assert.equal(stats.hints.length, 2);
        assert.equal((await player("GET", `/admin/levels/${origines.levels[0].id}/stats`)).status, 403);

        const before = stats.sessions;
        const s = (await admin("POST", `/levels/${origines.levels[0].id}/sessions`, { restart: true })).body;
        await attempt(admin, s.sessionId, [0, 3]);
        const after = (await admin("GET", `/admin/levels/${origines.levels[0].id}/stats`)).body;
        assert.equal(after.sessions, before, "une partie admin a été comptée");
    });

    await check("énigme du jour : hors parcours, première victoire comptée, série et partage", async () => {
        const daily = (await player("GET", "/daily")).body;
        assert.match(daily.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(daily.result, null);
        assert.equal(daily.streak.playedToday, false);
        assert.ok(!worlds.some((w) => w.slug === "quotidien"), "la réserve du jour apparaît dans les mondes");

        const detail = (await player("GET", `/levels/${daily.level.id}`)).body;
        assert.equal(detail.isDaily, true);
        assert.equal(detail.groups, undefined);

        // Une autre énigme de la réserve n'est pas jouable avant son jour.
        const reserve = (await admin("GET", "/admin/worlds")).body.find((w) => w.isDaily);
        const other = (await admin("GET", "/admin/levels")).body.find((l) => l.worldId === reserve.id && l.id !== daily.level.id);
        assert.equal((await player("GET", `/levels/${other.id}`)).status, 404);

        // La solution du jour, lue côté admin, jouée par le joueur après une erreur.
        const { groups, symbols } = (await admin("GET", `/admin/levels/${daily.level.id}`)).body;
        const linked = new Set(groups.flat());
        const wrong = [...symbols.keys()].filter((cell) => !linked.has(cell)).slice(0, groups[0].length);
        const s = (await player("POST", `/levels/${daily.level.id}/sessions`, { restart: true })).body;
        assert.equal((await attempt(player, s.sessionId, wrong)).body.result, "mismatch");
        let last;
        for (const group of groups) last = (await attempt(player, s.sessionId, group)).body;
        assert.equal(last.completion.daily.firstToday, true);
        assert.equal(last.completion.daily.streak.current, 1);
        assert.match(last.completion.daily.share, /🟥🟩/);
        assert.match(last.completion.daily.share, /Série : 1 jour$/);

        // Rejouer ne change pas le résultat du jour.
        const replay = (await player("POST", `/levels/${daily.level.id}/sessions`, {})).body;
        let again;
        for (const group of groups) again = (await attempt(player, replay.sessionId, group)).body;
        assert.equal(again.completion.daily.firstToday, false);
        const after = (await player("GET", "/daily")).body;
        assert.equal(after.result.mistakes, 1);
        assert.ok(after.solvedToday >= 1);
        assert.equal((await player("GET", "/me/progress")).body.totalLevels, 20);
    });

    await check("trio : 3 cases dans n'importe quel ordre", async () => {
        // Seed : Forêt 1 = cases 0, 2, 4.
        const detail = (await admin("GET", `/levels/${foret.levels[0].id}`)).body;
        assert.equal(detail.kind, "GROUPS");
        assert.equal(detail.groupSize, 3);
        const s = (await admin("POST", `/levels/${foret.levels[0].id}/sessions`, { restart: true })).body;
        assert.equal((await attempt(admin, s.sessionId, [0, 2])).status, 400);
        assert.equal((await attempt(admin, s.sessionId, [0, 2, 5])).body.result, "mismatch");
        const { body } = await attempt(admin, s.sessionId, [4, 0, 2]);
        assert.equal(body.result, "match");
        assert.ok(body.completion);
    });

    await check("suite : l'ordre exact compte", async () => {
        // Seed : Rivage 1 = cases 5 → 1 → 3 (glace, eau, nuage).
        const s = (await admin("POST", `/levels/${rivage.levels[0].id}/sessions`, { restart: true })).body;
        assert.equal((await attempt(admin, s.sessionId, [3, 1, 5])).body.result, "mismatch");
        assert.equal((await attempt(admin, s.sessionId, [1, 5, 3])).body.result, "mismatch");
        const { body } = await attempt(admin, s.sessionId, [5, 1, 3]);
        assert.equal(body.result, "match");
        assert.equal(body.completion.mistakes, 2);
    });

    await check("admin : mondes (création, identifiant unique, suppression protégée)", async () => {
        const input = { slug: `essai-${unique}`, title: "Monde d'essai", tagline: "Test", description: "Test", theme: "cosmos", published: false };
        assert.equal((await admin("POST", "/admin/worlds", { ...input, slug: "Pas Valide" })).status, 400);
        const created = await admin("POST", "/admin/worlds", input);
        assert.equal(created.status, 201);
        assert.equal((await admin("POST", "/admin/worlds", input)).status, 409);

        const draft = {
            worldId: created.body.id,
            kind: "GROUPS",
            title: `Brouillon ${unique}`,
            description: "Test",
            hints: ["h"],
            symbols: ["○", "△", "○", "□", "○", "◇"],
            columns: 3,
            groups: [[0, 2]],
            published: false,
        };
        const invalid = await admin("POST", "/admin/levels", draft);
        assert.equal(invalid.status, 400);
        assert.deepEqual(invalid.body.issues[0].path, ["groups"]);

        const level = await admin("POST", "/admin/levels", { ...draft, groups: [[0, 2, 4]] });
        assert.equal(level.status, 201);
        assert.equal(level.body.kind, "GROUPS");

        const copy = await admin("POST", `/admin/levels/${level.body.id}/duplicate`);
        assert.equal(copy.status, 201);
        assert.equal(copy.body.published, false);
        const reordered = await admin("POST", "/admin/levels/reorder", { worldId: created.body.id, ids: [copy.body.id, level.body.id] });
        assert.equal(reordered.status, 200);
        assert.equal(reordered.body.find((l) => l.worldId === created.body.id).id, copy.body.id);

        // Un monde non publié est invisible des joueurs ; il ne se supprime qu'une fois vide.
        assert.equal((await player("GET", `/worlds/${input.slug}`)).status, 404);
        assert.equal((await admin("DELETE", `/admin/worlds/${created.body.id}`)).status, 409);
        assert.equal((await admin("DELETE", `/admin/levels/${level.body.id}`)).status, 204);
        assert.equal((await admin("DELETE", `/admin/levels/${copy.body.id}`)).status, 204);
        assert.equal((await admin("DELETE", `/admin/worlds/${created.body.id}`)).status, 204);
    });
}

console.log(`\n${step} vérifications réussies.`);
