// Test de bout en bout contre une API démarrée (et une base seedée) :
//   npm run smoke -w @aether/api            (API_URL=http://localhost:4100/api par défaut)
// Parcourt : invité → énigme 1 (erreur, indice, résolution) → verrous → inscription → classement → admin.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");
const API = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4100}/api`;

/** Client minimal qui conserve le cookie de session, comme un navigateur. */
function client() {
    let cookie = "";
    return async function call(method, path, body) {
        const res = await fetch(API + path, {
            method,
            headers: { "content-type": "application/json", ...(cookie && { cookie }) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const setCookie = res.headers.get("set-cookie");
        if (setCookie) cookie = setCookie.split(";")[0];
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : null };
    };
}

let step = 0;
async function check(label, fn) {
    await fn();
    console.log(`  ✓ ${String(++step).padStart(2, "0")} ${label}`);
}

const player = client();
const unique = Date.now().toString(36);
let levels, session;

console.log(`Smoke test sur ${API}`);

await check("santé", async () => {
    assert.equal((await player("GET", "/health")).status, 200);
});

await check("sans session : /auth/me vaut null, routes de jeu → 401", async () => {
    assert.deepEqual((await player("GET", "/auth/me")).body, { me: null });
    assert.equal((await player("GET", "/levels")).status, 401);
});

await check("session invité", async () => {
    const { status, body } = await player("POST", "/auth/guest");
    assert.equal(status, 201);
    assert.equal(body.isGuest, true);
});

await check("parcours : 1re énigme ouverte, suivantes scellées, réponses jamais exposées", async () => {
    levels = (await player("GET", "/levels")).body;
    assert.ok(levels.length >= 2);
    assert.equal(levels[0].status, "available");
    assert.equal(levels[1].status, "locked");
    const detail = (await player("GET", `/levels/${levels[0].id}`)).body;
    assert.equal(detail.pairs, undefined);
    assert.equal((await player("GET", `/levels/${levels[1].id}`)).status, 403);
});

await check("démarrer puis reprendre la même partie", async () => {
    session = (await player("POST", `/levels/${levels[0].id}/sessions`, {})).body;
    const again = (await player("POST", `/levels/${levels[0].id}/sessions`, {})).body;
    assert.equal(again.sessionId, session.sessionId);
});

await check("validations : même case, case hors plateau", async () => {
    assert.equal((await player("POST", `/sessions/${session.sessionId}/attempts`, { a: 1, b: 1 })).status, 400);
    assert.equal((await player("POST", `/sessions/${session.sessionId}/attempts`, { a: 0, b: 99 })).status, 400);
});

await check("mauvaise paire → erreur comptée", async () => {
    const { body } = await player("POST", `/sessions/${session.sessionId}/attempts`, { a: 0, b: 1 });
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
    const { body } = await player("POST", `/sessions/${session.sessionId}/attempts`, { a: 3, b: 0 });
    assert.equal(body.result, "match");
    assert.ok(body.completion);
    assert.equal(body.completion.stars, 1);
    assert.equal(body.completion.isNewBest, true);
    assert.equal(body.completion.nextLevelId, levels[1].id);
    assert.equal((await player("POST", `/sessions/${session.sessionId}/attempts`, { a: 0, b: 3 })).status, 409);
});

await check("rejouer parfaitement → 3 étoiles, nouveau record", async () => {
    const replay = (await player("POST", `/levels/${levels[0].id}/sessions`, {})).body;
    const { body } = await player("POST", `/sessions/${replay.sessionId}/attempts`, { a: 0, b: 3 });
    assert.equal(body.completion.stars, 3);
    assert.equal(body.completion.isNewBest, true);
});

await check("énigme 2 débloquée, progression et stats à jour", async () => {
    const after = (await player("GET", "/levels")).body;
    assert.equal(after[0].status, "completed");
    assert.equal(after[0].bestStars, 3);
    assert.equal(after[1].status, "available");
    const progress = (await player("GET", "/me/progress")).body;
    assert.equal(progress.garden.completedLevels, 1);
    assert.equal(progress.nextLevelId, levels[1].id);
    const stats = (await player("GET", "/me/stats")).body;
    assert.equal(stats.levels[0].completions, 2);
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
    assert.equal((await player("GET", "/levels")).body[0].status, "completed");
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
    assert.equal((await other("GET", "/levels")).body[0].status, "completed");
});

await check("éditeur réservé aux administrateurs", async () => {
    assert.equal((await player("GET", "/admin/levels")).status, 403);
});

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const admin = client();
    await check("admin : créer (invalide puis valide), réordonner, supprimer", async () => {
        const login = await admin("POST", "/auth/login", {
            email: process.env.ADMIN_EMAIL,
            password: process.env.ADMIN_PASSWORD,
        });
        assert.equal(login.status, 200);

        const draft = {
            title: `Brouillon ${unique}`,
            description: "Test",
            hints: ["h"],
            symbols: ["○", "△", "○", "□"],
            columns: 2,
            pairs: [[0, 9]],
            published: false,
        };
        const invalid = await admin("POST", "/admin/levels", draft);
        assert.equal(invalid.status, 400);
        assert.deepEqual(invalid.body.issues[0].path, ["pairs", 0, 1]);

        const created = await admin("POST", "/admin/levels", { ...draft, pairs: [[0, 2]] });
        assert.equal(created.status, 201);
        assert.equal(created.body.pairs.length, 1);

        const all = (await admin("GET", "/admin/levels")).body;
        const ids = all.map((level) => level.id);
        const reordered = await admin("POST", "/admin/levels/reorder", { ids: [...ids].reverse() });
        assert.equal(reordered.body[0].id, created.body.id);
        await admin("POST", "/admin/levels/reorder", { ids });

        // Un brouillon n'est pas visible des joueurs.
        assert.equal((await player("GET", `/levels/${created.body.id}`)).status, 404);
        assert.equal((await admin("DELETE", `/admin/levels/${created.body.id}`)).status, 204);
    });
}

console.log(`\n${step} vérifications réussies.`);
