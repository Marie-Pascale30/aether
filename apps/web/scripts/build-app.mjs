// Construit la version des applications (Capacitor, Tauri) : un export statique dans `out/`,
// qui appelle l'API à l'adresse donnée.
//   AETHER_API_URL=https://api.exemple.fr npm run build:app -w @aether/web
// Pour l'émulateur Android avec l'API locale : AETHER_API_URL=http://10.0.2.2:4100
import { spawnSync } from "node:child_process";
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const apiUrl = process.env.AETHER_API_URL?.replace(/\/+$/, "");
if (!apiUrl) {
    console.error("AETHER_API_URL est requis (adresse de l'API, sans /api), par exemple https://api.exemple.fr");
    process.exit(1);
}

const result = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_EXPORT: "1", NEXT_PUBLIC_PLATFORM: "app", NEXT_PUBLIC_API_URL: apiUrl },
});
if (result.status !== 0) process.exit(result.status ?? 1);

/**
 * L'export range les données de navigation d'une page en dossiers (`mondes/__next.mondes/__PAGE__.txt`)
 * mais le routeur les demande à plat (`mondes/__next.mondes.__PAGE__.txt`), ce qu'un serveur Next
 * traduirait. Sans serveur (applis), on écrit aussi la version à plat.
 */
function flattenSegments(dir) {
    let count = 0;
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (!statSync(path).isDirectory()) continue;
        if (entry.startsWith("__next.")) {
            for (const file of walk(path)) {
                const flat = [entry, ...relative(path, file).split(sep)].join(".");
                copyFileSync(file, join(dir, flat));
                count += 1;
            }
        } else {
            count += flattenSegments(path);
        }
    }
    return count;
}

function* walk(dir) {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) yield* walk(path);
        else yield path;
    }
}

const flattened = flattenSegments("out");
console.log(`\nApplication construite dans apps/web/out (API : ${apiUrl}, ${flattened} fichiers de navigation mis à plat).`);
