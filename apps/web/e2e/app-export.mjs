// Vérifie l'export des applications (npm run build:app) servi depuis une autre origine que l'API,
// comme dans Capacitor ou Tauri : session par jeton, contenu embarqué, victoire enregistrée.
//   APP_URL=http://localhost:3120 API_URL=http://localhost:4100 node e2e/app-export.mjs
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const APP = process.env.APP_URL ?? "http://localhost:3120";
const API = process.env.API_URL ?? "http://localhost:4100";
const executablePath = [process.env.E2E_BROWSER, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome"].find(
    (path) => path && existsSync(path),
);

const browser = await chromium.launch({ executablePath });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("console", (msg) => msg.type() === "error" && errors.push(msg.text()));

try {
    await page.goto(APP + "/");
    await page.getByRole("link", { name: "Commencer" }).click();
    await page.getByRole("heading", { name: "Le Jardin des Échos" }).waitFor();
    const token = await page.evaluate(() => localStorage.getItem("aether:session"));
    if (!token) throw new Error("aucun jeton de session gardé par l'application");
    const cookies = await page.context().cookies(API);
    if (cookies.length) throw new Error("l'application ne doit pas dépendre d'un cookie");

    await page.getByRole("link", { name: "Entrer dans le monde" }).click();
    await page.getByRole("heading", { name: "Le premier lien" }).waitFor();
    await page.getByRole("button", { name: /^Écho 1 :/ }).click();
    await page.getByRole("button", { name: /^Écho 4 :/ }).click();
    await page.getByRole("dialog").getByText("Éclosion").waitFor();

    // La victoire part de la file d'envoi : le serveur la connaît, avec le jeton de l'application.
    for (let i = 0; i < 20; i++) {
        const sync = await (await fetch(`${API}/api/me/sync`, { headers: { authorization: `Bearer ${token}` } })).json();
        if (Object.keys(sync.levels ?? {}).length === 1) break;
        if (i === 19) throw new Error("victoire non enregistrée par l'API");
        await page.waitForTimeout(500);
    }
    if (await page.evaluate(() => navigator.serviceWorker?.controller)) throw new Error("service worker actif dans l'application");
    console.log("✓ export des applications : session par jeton, jeu et synchronisation");
} catch (error) {
    console.log("✗", error.message.split("\n")[0]);
    process.exitCode = 1;
} finally {
    await browser.close();
    if (errors.length) console.log(`${errors.length} erreur(s) navigateur :\n${errors.join("\n")}`);
}
