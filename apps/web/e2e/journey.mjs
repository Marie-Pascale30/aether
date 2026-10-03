// Parcours joueur + admin dans un vrai navigateur, avec captures dans e2e/.shots/.
// Prérequis : API et web démarrés, base seedée (npm run setup), Chrome ou Edge installé.
//   npm run e2e -w @aether/web
// Variables : E2E_BASE_URL (défaut http://localhost:3100), E2E_BROWSER (chemin de l'exécutable),
//             ADMIN_EMAIL / ADMIN_PASSWORD (défaut : valeurs de apps/api/.env.example).
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const OUT = fileURLToPath(new URL("./.shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@aether.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-moi-vite";

const BROWSERS = [
    process.env.E2E_BROWSER,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
].filter(Boolean);
const executablePath = BROWSERS.find((path) => existsSync(path));
if (!executablePath) throw new Error("Aucun navigateur trouvé : définis E2E_BROWSER.");
const errors = [];
/** Boîte d'envoi locale de l'API (MAIL_TRANSPORT=log). */
const OUTBOX = fileURLToPath(new URL("../../api/.mail-outbox/", import.meta.url));

function lastMailLink(email, path) {
    const slug = email.replace(/[^a-z0-9]+/gi, "_");
    const files = existsSync(OUTBOX) ? readdirSync(OUTBOX).filter((f) => f.endsWith(`-${slug}.json`)).sort() : [];
    const mail = files.map((f) => JSON.parse(readFileSync(OUTBOX + f, "utf8"))).filter((m) => m.text.includes(path)).at(-1);
    return mail?.text.match(/https?:\/\/\S+/)?.[0] ?? null;
}
let playerEmail = "";

const browser = await chromium.launch({ executablePath });

function watch(page, name) {
    page.on("console", (msg) => msg.type() === "error" && !msg.text().startsWith("Failed to load resource") && errors.push(`[${name}] console: ${msg.text()}`));
    page.on("response", (res) => res.status() >= 400 && errors.push(`[${name}] HTTP ${res.status()} ${res.request().method()} ${res.url()}`));
    page.on("pageerror", (err) => errors.push(`[${name}] pageerror: ${err.message}`));
}

const step = async (label, fn) => {
    try {
        await fn();
        console.log("✓", label);
    } catch (e) {
        console.log("✗", label, "\n   ", e.message.split("\n")[0]);
        throw e;
    }
};

const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
watch(page, "player");

try {
    await step("accueil", async () => {
        await page.goto(BASE);
        await page.getByRole("heading", { name: "AETHER" }).waitFor();
        await page.screenshot({ path: OUT + "01-home.png" });
    });

    await step("commencer → premier monde (invité créé)", async () => {
        await page.getByRole("link", { name: "Commencer" }).click();
        await page.waitForURL("**/mondes/origines");
        await page.getByRole("heading", { name: "Jardin des Origines" }).waitFor();
        await page.waitForTimeout(900);
        await page.screenshot({ path: OUT + "02-monde.png", fullPage: true });
    });

    await step("entrer → énigme 1", async () => {
        await page.getByRole("link", { name: "Entrer dans le monde" }).click();
        await page.getByRole("heading", { name: "Le premier lien" }).waitFor();
        await page.getByText("ÉNIGME 01 / 10").waitFor();
    });

    await step("sélection puis désélection", async () => {
        const e1 = page.getByRole("button", { name: /^Écho 1 :/ });
        await e1.click();
        if ((await e1.getAttribute("aria-pressed")) !== "true") throw new Error("pas sélectionné");
        await e1.click();
        if ((await e1.getAttribute("aria-pressed")) !== "false") throw new Error("pas désélectionné");
    });

    await step("mauvaise paire → erreur affichée puis effacée", async () => {
        await page.getByRole("button", { name: /^Écho 1 :/ }).click();
        await page.getByRole("button", { name: /^Écho 2 :/ }).click();
        await page.getByText("Ce lien ne résonne pas").waitFor();
        await page.screenshot({ path: OUT + "03-mismatch.png" });
        await page.getByText("Essaie une autre relation.").waitFor({ timeout: 3000 });
    });

    await step("indice demandé", async () => {
        await page.getByRole("button", { name: /Demander un indice/ }).click();
        await page.getByText("Indice 1 :").waitFor();
    });

    await step("bonne paire → panneau de fin", async () => {
        await page.getByRole("button", { name: /^Écho 1 :/ }).click();
        await page.getByRole("button", { name: /^Écho 4 :/ }).click();
        await page.getByRole("dialog").waitFor();
        await page.waitForTimeout(1300);
        await page.screenshot({ path: OUT + "04-completion.png" });
    });

    await step("voir le plateau (lien tracé)", async () => {
        await page.getByRole("button", { name: "Voir le plateau" }).click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: OUT + "05-board-linked.png" });
    });

    await step("mondes : le premier entamé, les suivants scellés", async () => {
        await page.goto(BASE + "/mondes");
        await page.getByRole("heading", { name: "Les mondes" }).waitFor();
        await page.getByText(/^1 \/ \d+ énigmes/).first().waitFor();
        await page.getByText("Restaure le monde précédent pour l'ouvrir.").first().waitFor();
        await page.waitForTimeout(400);
        await page.screenshot({ path: OUT + "06-mondes.png", fullPage: true });
    });

    await step("énigme suivante depuis la carte du monde", async () => {
        await page.getByRole("link", { name: /Jardin des Origines/ }).click();
        await page.getByRole("link", { name: /L'ombre et la lumière/ }).click();
        await page.getByRole("heading", { name: "L'ombre et la lumière" }).waitFor();
    });

    await step("« mon jardin » mène au monde en cours, qui a poussé", async () => {
        await page.goto(BASE + "/jardin");
        await page.waitForURL("**/mondes/origines");
        await page.getByText("1 / 10 énigmes restaurées").waitFor();
        await page.waitForTimeout(2500);
        await page.screenshot({ path: OUT + "07-jardin-grown.png" });
    });

    await step("inscription (erreurs puis succès)", async () => {
        await page.goto(BASE + "/inscription");
        await page.getByRole("button", { name: "Créer mon compte" }).click();
        await page.getByText("Adresse e-mail invalide.").waitFor();
        await page.screenshot({ path: OUT + "08-register-errors.png" });
        const id = Date.now().toString(36);
        await page.getByLabel("Pseudo").fill(`Flore ${id.slice(-4)}`);
        playerEmail = `e2e-${id}@aether.local`;
        await page.getByLabel("Adresse e-mail").fill(playerEmail);
        await page.getByLabel("Mot de passe").fill("motdepasse-solide");
        await page.getByRole("button", { name: "Créer mon compte" }).click();
        await page.waitForURL("**/mondes");
        await page.getByRole("link", { name: /Flore/ }).waitFor();
    });

    await step("classement", async () => {
        await page.goto(BASE + "/classement");
        await page.getByText("(toi)").waitFor();
        await page.screenshot({ path: OUT + "09-leaderboard.png" });
    });

    await step("profil & stats", async () => {
        await page.goto(BASE + "/profil");
        await page.getByRole("heading", { name: "Statistiques" }).waitFor();
        await page.screenshot({ path: OUT + "10-profile.png", fullPage: true });
    });

    await step("adresse confirmée par le lien reçu par e-mail", async () => {
        await page.getByText("Ton adresse n'est pas encore confirmée").waitFor();
        const link = lastMailLink(playerEmail, "/verifier-email");
        if (!link) throw new Error("aucun e-mail de vérification dans la boîte d'envoi locale");
        await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
        await page.getByRole("heading", { name: /Merci/ }).waitFor();
        await page.goto(BASE + "/profil");
        await page.getByText("adresse confirmée ✓").waitFor();
    });

    await step("déconnexion → pas de nouvel invité automatique", async () => {
        await page.getByRole("button", { name: "Se déconnecter" }).click();
        await page.waitForURL(BASE + "/");
        await page.goto(BASE + "/mondes");
        await page.getByRole("heading", { name: "Session fermée" }).waitFor();
    });

    await step("mot de passe oublié → nouveau mot de passe → connecté", async () => {
        await page.goto(BASE + "/connexion");
        await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
        await page.waitForURL("**/mot-de-passe-oublie");
        await page.getByLabel("Adresse e-mail").fill(playerEmail);
        await page.getByRole("button", { name: "Recevoir le lien" }).click();
        await page.getByText("un lien pour choisir un nouveau mot de passe vient").waitFor();
        const link = lastMailLink(playerEmail, "/reinitialiser");
        if (!link) throw new Error("aucun e-mail de réinitialisation");
        await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
        await page.getByLabel("Nouveau mot de passe").fill("nouveau-secret-e2e");
        await page.getByLabel("Confirmation").fill("nouveau-secret-e2e");
        await page.getByRole("button", { name: "Enregistrer et me connecter" }).click();
        await page.waitForURL("**/mondes");
        await page.getByRole("link", { name: /Flore/ }).waitFor();
    });

    const admin = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
    watch(admin, "admin");

    await step("admin : connexion + liste par monde", async () => {
        await admin.goto(BASE + "/connexion?next=/admin/niveaux");
        await admin.getByLabel("Adresse e-mail").fill(ADMIN_EMAIL);
        await admin.getByLabel("Mot de passe").fill(ADMIN_PASSWORD);
        await admin.getByRole("button", { name: "Me connecter" }).click();
        await admin.waitForURL("**/admin/niveaux");
        await admin.getByRole("link", { name: "Le premier lien" }).waitFor();
        await admin.getByRole("heading", { name: "Rivage des Suites" }).waitFor();
        await admin.screenshot({ path: OUT + "11-admin-list.png", fullPage: true });
    });

    await step("admin : statistiques et fausses pistes d'une énigme", async () => {
        await admin.getByRole("link", { name: "Le premier lien" }).click();
        await admin.getByRole("heading", { name: "Comment les joueurs la vivent" }).waitFor();
        // Le joueur de ce parcours a tenté Écho 1 + Écho 2.
        await admin.getByText("cases 1, 2").first().waitFor();
        await admin.getByRole("heading", { name: "Comment les joueurs la vivent" }).scrollIntoViewIfNeeded();
        await admin.screenshot({ path: OUT + "11b-admin-stats.png", fullPage: true });
        await admin.goto(BASE + "/admin/niveaux");
    });

    await step("suite jouée dans l'ordre (aperçu admin)", async () => {
        // Seed : Rivage 1 = cases 6 → 2 → 4 (glace, eau, nuage), numérotées à partir de 1.
        await admin.getByRole("row", { name: /La glace et la vapeur/ }).getByRole("link", { name: "Tester" }).click();
        await admin.getByRole("heading", { name: "La glace et la vapeur" }).waitFor();
        await admin.getByRole("button", { name: /Recommencer/ }).click();
        await admin.getByText("Relie 3 éléments dans le bon ordre").waitFor();
        await admin.getByRole("button", { name: /^Écho 6 :/ }).click();
        await admin.getByRole("button", { name: /^Écho 2 :/ }).click();
        await admin.getByRole("button", { name: /^Écho 2 :.*étape 2/ }).waitFor();
        await admin.screenshot({ path: OUT + "12-sequence-selection.png" });
        await admin.getByRole("button", { name: /^Écho 4 :/ }).click();
        await admin.getByRole("dialog").waitFor();
        await admin.getByRole("button", { name: "Voir le plateau" }).click();
        await admin.waitForTimeout(900);
        await admin.screenshot({ path: OUT + "13-sequence-linked.png" });
    });

    await step("énigme du jour : résolue puis résumé à partager", async () => {
        const daily = await (await admin.request.get(BASE + "/api/daily")).json();
        const { groups } = await (await admin.request.get(`${BASE}/api/admin/levels/${daily.level.id}`)).json();
        await admin.goto(BASE + "/quotidien");
        await admin.getByRole("heading", { name: daily.level.title }).waitFor();
        await admin.getByRole("link", { name: /Relever le défi|Rejouer/ }).click();
        await admin.getByText("ÉNIGME DU JOUR", { exact: true }).waitFor();
        await admin.getByRole("button", { name: /Recommencer/ }).click();
        await admin.waitForTimeout(300);
        for (const group of groups) {
            for (const cell of group) await admin.getByRole("button", { name: new RegExp(`^Écho ${cell + 1} :`) }).click();
            await admin.waitForTimeout(250);
        }
        await admin.getByRole("dialog").getByText("Énigme du jour", { exact: true }).waitFor();
        await admin.getByRole("dialog").getByRole("button", { name: "Partager mon résultat" }).waitFor();
        await admin.waitForTimeout(1200);
        await admin.screenshot({ path: OUT + "13b-daily-completion.png" });
        await admin.getByRole("link", { name: "Résumé du jour" }).click();
        await admin.getByText("Série en cours").waitFor();
        await admin.getByText(/AETHER · Énigme du jour/).waitFor();
        await admin.screenshot({ path: OUT + "13c-daily.png", fullPage: true });
    });

    await step("les 4 mécaniques locales se jouent jusqu'au bout (souris)", async () => {
        const api = async (path) => (await admin.request.get(BASE + "/api" + path)).json();
        const firstLevel = async (slug) => (await api(`/worlds/${slug}`)).levels[0].id;
        const open = async (slug) => {
            const id = await firstLevel(slug);
            await admin.goto(`${BASE}/niveaux/${id}`);
            return (await api(`/admin/levels/${id}`)).puzzle;
        };
        const finish = async (name) => {
            await admin.getByRole("dialog").waitFor();
            await admin.waitForTimeout(900);
            await admin.screenshot({ path: OUT + `18-${name}.png` });
            await admin.getByRole("button", { name: "Voir le plateau" }).click();
        };

        // Mémoires : observer, puis retrouver chaque case demandée.
        let puzzle = await open("bibliotheque-vivante");
        await admin.getByRole("button", { name: "J'ai mémorisé" }).click();
        for (const cell of puzzle.targets) await admin.getByRole("button", { name: new RegExp(`^Case ${cell + 1}( :|$)`) }).click();
        await finish("memoires");

        // Rouages : chaque pièce mobile revient à sa rotation d'origine (quarts de tour horaires).
        puzzle = await open("atelier-des-inventeurs");
        for (const [i, tile] of puzzle.tiles.entries()) {
            if (tile.fixed || tile.mask === 0) continue;
            const piece = admin.getByRole("button", { name: new RegExp(`^Pièce ${i + 1}(,|$)`) });
            for (let n = 0; n < (4 - tile.rotation) % 4; n++) await piece.click();
        }
        await finish("rouages");

        // Flux : chaque chemin de la solution est tracé en glissant d'une case à l'autre.
        puzzle = await open("canaux-d-ether");
        const box = await admin.getByRole("application").boundingBox();
        const at = (cell) => ({
            x: box.x + ((cell % puzzle.columns) + 0.5) * (box.width / puzzle.columns),
            y: box.y + (Math.floor(cell / puzzle.columns) + 0.5) * (box.height / puzzle.rows),
        });
        for (const path of puzzle.solution) {
            await admin.mouse.move(at(path[0]).x, at(path[0]).y);
            await admin.mouse.down();
            for (const cell of path.slice(1)) await admin.mouse.move(at(cell).x, at(cell).y, { steps: 3 });
            await admin.mouse.up();
        }
        await finish("flux");

        // Échos : une mauvaise proposition s'efface, puis la bonne.
        puzzle = await open("salle-des-echos");
        const wrong = puzzle.options.findIndex((_, i) => i !== puzzle.answer);
        await admin.getByRole("button", { name: puzzle.options[wrong], exact: true }).click();
        await admin.getByText("Cet écho ne répond pas à la règle").waitFor();
        await admin.getByRole("button", { name: puzzle.options[puzzle.answer], exact: true }).click();
        await finish("echos");
    });

    await step("admin : mondes", async () => {
        await admin.goto(BASE + "/admin/mondes");
        await admin.getByRole("heading", { name: "Mondes" }).waitFor();
        await admin.getByRole("heading", { name: "Forêt des Échos" }).waitFor();
        await admin.screenshot({ path: OUT + "14-admin-mondes.png", fullPage: true });
    });

    await step("admin : éditeur d'une famille (validation en direct)", async () => {
        await admin.goto(BASE + "/admin/niveaux/nouveau");
        await admin.getByRole("heading", { name: "Nouvelle énigme" }).waitFor();
        await admin.getByRole("button", { name: "Enregistrer" }).click();
        await admin.getByText("Le titre est requis.").first().waitFor();
        await admin.getByRole("textbox", { name: "Titre" }).fill("Essai e2e");
        if (await admin.getByText("Le titre est requis.").count()) throw new Error("erreur de titre toujours affichée après correction");
        await admin.getByRole("textbox", { name: "Description" }).fill("Brouillon de test");
        await admin.getByRole("textbox", { name: "Indice 1" }).fill("Regarde bien.");
        // Palette : case 1 active, puis deux symboles placés d'affilée (cases 1 et 2).
        await admin.getByRole("textbox", { name: "Symbole de la case 1" }).click();
        await admin.getByRole("tab", { name: "Vivant" }).click();
        await admin.getByRole("button", { name: /^Placer 🦊/ }).click();
        await admin.getByRole("button", { name: /^Placer 🦉/ }).click();
        if ((await admin.getByRole("textbox", { name: "Symbole de la case 1" }).inputValue()) !== "🦊") throw new Error("palette : case 1 non remplie");
        if ((await admin.getByRole("textbox", { name: "Symbole de la case 2" }).inputValue()) !== "🦉") throw new Error("palette : passage à la case suivante raté");
        await admin.getByRole("radio", { name: /Familles/ }).click();
        // Cases 1, 4 et 5 : chaque case choisie quitte la liste des boutons « relier ».
        for (const nth of [0, 2, 2]) await admin.getByRole("button", { name: "relier" }).nth(nth).click();
        await admin.getByText("Lien 1 :").waitFor();
        await admin.screenshot({ path: OUT + "15-editor.png", fullPage: true });
        await admin.getByRole("button", { name: "Enregistrer" }).click();
        await admin.waitForURL(/\/admin\/niveaux\/[a-z0-9]+$/);
        await admin.getByRole("heading", { name: "Modifier l'énigme" }).waitFor();
    });

    await step("admin : glisser-déposer pour réordonner (puis rétablir)", async () => {
        await admin.goto(BASE + "/admin/niveaux");
        const order = async () =>
            (await (await admin.request.get(BASE + "/api/admin/levels")).json())
                .filter((l) => l.title === "Les trois sœurs" || l.title === "Le voyage de l'eau")
                .map((l) => l.title);
        const before = await order();
        const first = admin.getByRole("row", { name: /Les trois sœurs/ });
        const second = admin.getByRole("row", { name: /Le voyage de l'eau/ });
        const reordered = () => admin.waitForResponse((res) => res.url().endsWith("/api/admin/levels/reorder") && res.ok());
        await Promise.all([reordered(), second.dragTo(first)]);
        const after = await order();
        if (after[0] !== "Le voyage de l'eau") throw new Error(`ordre inchangé : ${after.join(", ")}`);
        await Promise.all([
            reordered(),
            admin.getByRole("row", { name: /Les trois sœurs/ }).dragTo(admin.getByRole("row", { name: /Le voyage de l'eau/ })),
        ]);
        if ((await order()).join() !== before.join()) throw new Error("ordre non rétabli");
    });

    await step("admin : suppression du brouillon", async () => {
        await admin.goto(BASE + "/admin/niveaux");
        admin.once("dialog", (dialog) => dialog.accept());
        const row = admin.getByRole("row", { name: /Essai e2e/ });
        await row.getByRole("button", { name: "Supprimer" }).click();
        await row.waitFor({ state: "detached" });
    });

    const keyboard = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
    watch(keyboard, "clavier");

    await step("clavier seul : lien d'évitement, flèches et Entrée sur le plateau", async () => {
        await keyboard.goto(BASE + "/jardin");
        await keyboard.getByRole("link", { name: "Entrer dans le monde" }).click();
        await keyboard.getByRole("heading", { name: "Le premier lien" }).waitFor();
        // Arrivée directe sur la page : le premier Tab doit atteindre le lien d'évitement.
        await keyboard.reload();
        await keyboard.getByRole("heading", { name: "Le premier lien" }).waitFor();
        await keyboard.keyboard.press("Tab");
        if (!(await keyboard.getByRole("link", { name: "Aller au contenu" }).evaluate((el) => el === document.activeElement))) {
            throw new Error("le lien d'évitement n'est pas le premier élément focalisable");
        }
        // Une seule case dans l'ordre de tabulation, puis les flèches. Seed : énigme 1 = Écho 1 + Écho 4.
        await keyboard.getByRole("button", { name: /^Écho 1 :/ }).focus();
        for (let i = 0; i < 3; i++) await keyboard.keyboard.press("ArrowRight");
        const focused = await keyboard.evaluate(() => document.activeElement?.getAttribute("aria-label"));
        if (!focused?.startsWith("Écho 4")) throw new Error(`focus attendu sur Écho 4, obtenu : ${focused}`);
        await keyboard.keyboard.press("Enter");
        await keyboard.keyboard.press("Home");
        await keyboard.keyboard.press(" ");
        await keyboard.getByRole("dialog").waitFor();
        await keyboard.keyboard.press("Escape");
        await keyboard.getByRole("dialog").waitFor({ state: "detached" });
    });

    await step("réglages : animations réduites et grands symboles, conservés au rechargement", async () => {
        await keyboard.goto(BASE + "/reglages");
        await keyboard.getByRole("heading", { name: "Réglages" }).waitFor();
        await keyboard.getByRole("radio", { name: /Réduire/ }).check();
        await keyboard.getByRole("radio", { name: "Grande" }).check();
        await keyboard.getByRole("switch", { name: "Nappe d'ambiance" }).uncheck({ force: true });
        await keyboard.screenshot({ path: OUT + "17-reglages.png", fullPage: true });
        await keyboard.reload();
        await keyboard.getByRole("radio", { name: "Grande" }).waitFor();
        const html = await keyboard.evaluate(() => ({ ...document.documentElement.dataset }));
        if (html.motion !== "reduce" || html.symbols !== "large") throw new Error(`réglages non appliqués : ${JSON.stringify(html)}`);
        if (await keyboard.getByRole("switch", { name: "Nappe d'ambiance" }).isChecked()) throw new Error("ambiance réactivée au rechargement");
    });

    await step("mobile : énigme lisible à 390 px", async () => {
        const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
        watch(mobile, "mobile");
        await mobile.goto(BASE + "/jardin");
        await mobile.getByRole("link", { name: "Entrer dans le monde" }).click();
        await mobile.getByRole("heading", { name: "Le premier lien" }).waitFor();
        await mobile.screenshot({ path: OUT + "16-mobile.png", fullPage: true });
        const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) throw new Error("défilement horizontal sur mobile");
    });
} catch {
    process.exitCode = 1;
} finally {
    await browser.close();
    console.log(errors.length ? `\n${errors.length} erreur(s) navigateur :\n${errors.join("\n")}` : "\nAucune erreur navigateur.");
}
