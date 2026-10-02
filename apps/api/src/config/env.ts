import { existsSync } from "node:fs";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4100),
    DATABASE_URL: z.string().min(1, "DATABASE_URL est requis."),
    JWT_SECRET: z.string().min(32, "JWT_SECRET doit contenir au moins 32 caractères."),
    WEB_ORIGIN: z.string().default("http://localhost:3100"),
});

export type Env = z.infer<typeof envSchema>;

/** Jeton d'injection de la configuration validée. */
export const ENV = Symbol("ENV");

/** Charge `.env` s'il existe, puis valide : l'API refuse de démarrer si la configuration est invalide. */
export function loadEnv(): Env {
    if (existsSync(".env")) process.loadEnvFile(".env");

    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Configuration invalide (voir apps/api/.env.example) :\n${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
}
