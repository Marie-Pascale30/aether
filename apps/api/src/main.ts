import type { IncomingMessage as Request } from "node:http";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { ENV, type Env } from "./config/env";
import { SESSION_TOKEN_HEADER } from "./auth/auth.service";

async function bootstrap() {
    // Journaux mis en tampon jusqu'à ce que pino soit prêt : rien n'est perdu au démarrage.
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    const logger = app.get(Logger);
    app.useLogger(logger);
    const env = app.get<Env>(ENV);

    // Le front relaie les appels via son proxy : on lui fait confiance pour l'IP cliente
    // (sinon la limitation de débit traiterait tous les joueurs comme un seul).
    app.set("trust proxy", trustProxy(env.TRUST_PROXY));
    app.use(proxyChainProbe(logger));
    app.setGlobalPrefix("api");
    // En-têtes de sécurité (nosniff, CSP fermée, HSTS, Referrer-Policy…) ; Express ne se nomme plus.
    app.disable("x-powered-by");
    app.use(helmet());
    app.use(cookieParser());
    // Le site (même origine via le proxy de Next) et les applications (Capacitor, Tauri).
    app.enableCors({
        origin: [env.WEB_ORIGIN, ...env.APP_ORIGINS],
        credentials: true,
        exposedHeaders: ["x-request-id", SESSION_TOKEN_HEADER],
    });
    app.enableShutdownHooks();

    await app.listen(env.PORT);
    logger.log(`API AETHER prête sur http://localhost:${env.PORT}/api`, "Bootstrap");
}

/**
 * Valeur Express de « trust proxy » : un nombre de sauts (« 2 ») ou une liste d'adresses / de
 * sous-réseaux nommés (« loopback,uniquelocal »).
 */
function trustProxy(value: string): number | string[] {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed.split(",").map((item) => item.trim());
}

/**
 * Diagnostic temporaire : décrit, pour les premières requêtes après le démarrage, la forme de la
 * chaîne X-Forwarded-For (nombre d'entrées, publiques ou privées), sans jamais journaliser d'adresse.
 * Sert à régler TRUST_PROXY derrière Vercel puis Render.
 */
function proxyChainProbe(logger: Logger) {
    let remaining = 40;
    const kind = (ip: string) => {
        const v4 = ip.replace(/^::ffff:/, "");
        if (v4 === "127.0.0.1" || v4 === "::1") return "loopback";
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(v4) || /^f[cd]/i.test(v4)) return "prive";
        return "public";
    };
    return (req: Request, _res: unknown, next: () => void) => {
        if (remaining > 0 && req.url?.startsWith("/api/") && !req.url.startsWith("/api/health")) {
            remaining -= 1;
            const header = req.headers["x-forwarded-for"];
            const chain = (Array.isArray(header) ? header.join(",") : (header ?? "")).split(",").map((v) => v.trim()).filter(Boolean);
            logger.log(
                {
                    msg: "Chaîne de proxys",
                    xff: chain.map(kind),
                    socket: kind(req.socket.remoteAddress ?? ""),
                    viaVercel: Boolean(req.headers["x-vercel-id"]),
                    path: req.url.split("?")[0],
                },
                "ProxyProbe",
            );
        }
        next();
    };
}

void bootstrap();
