import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { LoggerModule } from "nestjs-pino";
import { ENV, type Env } from "../config/env";

const REQUEST_ID_HEADER = "x-request-id";
const VALID_REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * Journaux JSON (lisibles en couleur en développement) : une ligne par requête,
 * avec un identifiant de requête renvoyé au client pour relier une erreur à son journal.
 */
@Module({
    imports: [
        LoggerModule.forRootAsync({
            inject: [ENV],
            useFactory: (env: Env) => ({
                pinoHttp: {
                    level: env.LOG_LEVEL,
                    transport:
                        env.NODE_ENV === "development"
                            ? { target: "pino-pretty", options: { singleLine: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } }
                            : undefined,
                    genReqId: (req: IncomingMessage, res: ServerResponse) => {
                        const incoming = req.headers[REQUEST_ID_HEADER];
                        const id = typeof incoming === "string" && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
                        res.setHeader(REQUEST_ID_HEADER, id);
                        return id;
                    },
                    // Jamais de cookie de session ni de mot de passe dans les journaux.
                    redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
                    serializers: {
                        req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
                        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
                    },
                    customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) =>
                        error || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
                    customProps: (req: IncomingMessage & { user?: { id: string } }) => (req.user ? { userId: req.user.id } : {}),
                    autoLogging: { ignore: (req: IncomingMessage) => req.url === "/api/health" },
                },
            }),
        }),
    ],
})
export class LoggingModule {}
