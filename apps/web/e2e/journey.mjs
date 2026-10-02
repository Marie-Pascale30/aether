// Parcours joueur + admin dans un vrai navigateur, avec captures dans e2e/.shots/.
// Prérequis : API et web démarrés, base seedée (npm run setup), Chrome ou Edge installé.
//   npm run e2e -w @aether/web
// Variables : E2E_BASE_URL (défaut http://localhost:3100), E2E_BROWSER (chemin de l'exécutable),
//             ADMIN_EMAIL / ADMIN_PASSWORD (défaut : valeurs de apps/api/.env.example).
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
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

    await step("commencer → jardin (invité créé)", async () => {
        await page.getByRole("link", { name: "Commencer" }).click();
        await page.getByRole("heading", { name: "Les Liens" }).waitFor();
        await page.waitForTimeout(900);
        await page.screenshot({ path: OUT + "02-jardin.png" });
    });

    await step("entrer → énigme 1", async () => {
        await page.getByRole("link", { name: "Entrer dans le jardin" }).click();
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

    await step("énigme suivante", async () => {
        await page.goto(BASE + "/niveaux");
        await page.getByRole("heading", { name: "Les énigmes" }).waitFor();
        await page.waitForTimeout(500);
        await page.screenshot({ path: OUT + "06-map.png" });
        await page.getByRole("link", { name: /L'ombre et la lumière/ }).click();
        await page.getByRole("heading", { name: "L'ombre et la lumière" }).waitFor();
    });

    await step("jardin a poussé", async () => {
        await page.goto(BASE + "/jardin");
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
        await page.getByLabel("Adresse e-mail").fill(`e2e-${id}@aether.local`);
        await page.getByLabel("Mot de passe").fill("motdepasse-solide");
        await page.getByRole("button", { name: "Créer mon compte" }).click();
        await page.waitForURL("**/niveaux");
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

    await step("déconnexion → pas de nouvel invité automatique", async () => {
        await page.getByRole("button", { name: "Se déconnecter" }).click();
        await page.waitForURL(BASE + "/");
        await page.goto(BASE + "/niveaux");
        await page.getByRole("heading", { name: "Session fermée" }).waitFor();
    });

    const admin = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
    watch(admin, "admin");

    await step("admin : connexion + liste", async () => {
        await admin.goto(BASE + "/connexion?next=/admin/niveaux");
        await admin.getByLabel("Adresse e-mail").fill(ADMIN_EMAIL);
        await admin.getByLabel("Mot de passe").fill(ADMIN_PASSWORD);
        await admin.getByRole("button", { name: "Me connecter" }).click();
        await admin.waitForURL("**/admin/niveaux");
        await admin.getByRole("link", { name: "Le premier lien" }).waitFor();
        await admin.screenshot({ path: OUT + "11-admin-list.png" });
    });

    await step("admin : éditeur (paire invalide refusée côté client)", async () => {
        await admin.getByRole("link", { name: "+ Nouvelle énigme" }).click();
        await admin.getByRole("heading", { name: "Nouvelle énigme" }).waitFor();
        await admin.getByRole("button", { name: "Enregistrer" }).click();
        await admin.getByText("Le titre est requis.").first().waitFor();
        await admin.getByRole("textbox", { name: "Titre" }).fill("Essai e2e");
        if (await admin.getByText("Le titre est requis.").count()) throw new Error("erreur de titre toujours affichée après correction");
        await admin.getByRole("textbox", { name: "Description" }).fill("Brouillon de test");
        await admin.getByRole("textbox", { name: "Indice 1" }).fill("Regarde bien.");
        const relier = admin.getByRole("button", { name: "relier" });
        await relier.nth(0).click();
        await admin.getByRole("button", { name: "relier" }).nth(3).click(); // case 5 (4e bouton « relier » restant)
        await admin.getByText("Paire 1 :").waitFor();
        await admin.screenshot({ path: OUT + "12-editor.png", fullPage: true });
        await admin.getByRole("button", { name: "Enregistrer" }).click();
        await admin.waitForURL(/\/admin\/niveaux\/[a-z0-9]+$/);
        await admin.getByRole("heading", { name: "Modifier l'énigme" }).waitFor();
    });

    await step("admin : suppression du brouillon", async () => {
        await admin.goto(BASE + "/admin/niveaux");
        admin.once("dialog", (dialog) => dialog.accept());
        const row = admin.getByRole("row", { name: /Essai e2e/ });
        await row.getByRole("button", { name: "Supprimer" }).click();
        await row.waitFor({ state: "detached" });
    });

    await step("mobile : énigme lisible à 390 px", async () => {
        const mobile = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
        watch(mobile, "mobile");
        await mobile.goto(BASE + "/jardin");
        await mobile.getByRole("link", { name: "Entrer dans le jardin" }).click();
        await mobile.getByRole("heading", { name: "Le premier lien" }).waitFor();
        await mobile.screenshot({ path: OUT + "13-mobile.png", fullPage: true });
        const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) throw new Error("défilement horizontal sur mobile");
    });
} catch {
    process.exitCode = 1;
} finally {
    await browser.close();
    console.log(errors.length ? `\n${errors.length} erreur(s) navigateur :\n${errors.join("\n")}` : "\nAucune erreur navigateur.");
}
