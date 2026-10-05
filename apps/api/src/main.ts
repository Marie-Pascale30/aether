import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { ENV, type Env } from "./config/env";

async function bootstrap() {
    // Journaux mis en tampon jusqu'à ce que pino soit prêt : rien n'est perdu au démarrage.
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    const logger = app.get(Logger);
    app.useLogger(logger);
    const env = app.get<Env>(ENV);

    // Le front relaie les appels via son proxy : on lui fait confiance pour l'IP cliente
    // (sinon la limitation de débit traiterait tous les joueurs comme un seul).
    app.set("trust proxy", env.TRUST_PROXY.split(",").map((value) => value.trim()));
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.enableCors({ origin: env.WEB_ORIGIN, credentials: true, exposedHeaders: ["x-request-id"] });
    app.enableShutdownHooks();

    await app.listen(env.PORT);
    logger.log(`API AETHER prête sur http://localhost:${env.PORT}/api`, "Bootstrap");
}

void bootstrap();
