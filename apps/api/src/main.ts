import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { ENV, type Env } from "./config/env";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const env = app.get<Env>(ENV);

    // Le front relaie les appels via son proxy local : on lui fait confiance pour l'IP cliente
    // (sinon la limitation de débit traiterait tous les joueurs comme un seul).
    app.set("trust proxy", "loopback");
    app.setGlobalPrefix("api");
    app.use(cookieParser());
    app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
    app.enableShutdownHooks();

    await app.listen(env.PORT);
    console.log(`API AETHER prête sur http://localhost:${env.PORT}/api`);
}

void bootstrap();
