// Construit l'application de bureau. La CSP de src-tauri/tauri.conf.json n'autorise que l'API de
// production ; si l'export a été construit pour une autre API (AETHER_API_URL), son origine est
// ajoutée à connect-src pour cette construction (fichier de configuration fusionné par Tauri).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const conf = JSON.parse(readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
const csp = conf.app.security.csp;
const args = ["tauri", "build", ...process.argv.slice(2)];

const apiUrl = process.env.AETHER_API_URL;
if (apiUrl) {
    const origin = new URL(apiUrl).origin;
    if (!csp["connect-src"].split(" ").includes(origin)) {
        const dir = mkdtempSync(join(tmpdir(), "aether-tauri-"));
        const file = join(dir, "csp.json");
        writeFileSync(file, JSON.stringify({ app: { security: { csp: { ...csp, "connect-src": `${csp["connect-src"]} ${origin}` } } } }));
        args.push("--config", file);
        console.log(`CSP : API ${origin} ajoutée à connect-src.`);
    }
}

const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
