// Lance shared + API + web en développement. Si le port attendu (3100 pour le web, 4100 pour l'API)
// est déjà pris, on prend le suivant libre et on relie les deux côtés entre eux (proxy /api, CORS,
// liens des e-mails) pour que tout fonctionne sans rien configurer.
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/** Vrai si personne n'écoute déjà sur ce port (IPv4 comme IPv6). */
function canListen(port, host) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", (error) => resolve(error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL"));
        server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
    });
}

async function isFree(port) {
    for (const host of ["0.0.0.0", "127.0.0.1", "::", "::1"]) {
        if (!(await canListen(port, host))) return false;
    }
    return true;
}

async function findPort(preferred, taken = new Set()) {
    for (let port = preferred; port < preferred + 100; port++) {
        if (!taken.has(port) && (await isFree(port))) return port;
    }
    throw new Error(`Aucun port libre entre ${preferred} et ${preferred + 99}.`);
}

const wantedWeb = 3100;
const wantedApi = 4100;
const webPort = await findPort(wantedWeb);
const apiPort = await findPort(wantedApi, new Set([webPort]));

const note = (name, wanted, port) =>
    port === wanted ? `${name} : ${port}` : `${name} : ${port} (le port ${wanted} est occupé)`;
console.log(`\n  ${note("Web", wantedWeb, webPort)}\n  ${note("API", wantedApi, apiPort)}\n`);
console.log(`  → http://localhost:${webPort}\n`);

const build = spawnSync(npm, ["run", "build", "-w", "@aether/shared"], { stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const webUrl = `http://localhost:${webPort}`;
const child = spawn(
    npm,
    [
        "exec", "--", "concurrently",
        "--kill-others-on-fail",
        "-n", "shared,api,web",
        "-c", "gray,magenta,cyan",
        `"npm run dev -w @aether/shared"`,
        `"npm run dev -w @aether/api"`,
        `"npm exec -w @aether/web -- next dev -p ${webPort}"`,
    ],
    {
        stdio: "inherit",
        shell: true,
        env: {
            ...process.env,
            // API (prioritaire sur apps/api/.env)
            PORT: String(apiPort),
            WEB_ORIGIN: webUrl,
            APP_URL: webUrl,
            // Proxy /api de Next
            API_URL: `http://localhost:${apiPort}`,
        },
    },
);
child.on("exit", (code) => process.exit(code ?? 0));
