import { existsSync } from "node:fs";
import { z } from "zod";

/** Valeur d'exemple de `.env.example` : acceptable en local, jamais en production. */
const EXAMPLE_JWT_SECRET = "remplace-moi-par-une-longue-chaine-aleatoire-de-32-caracteres-minimum";

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z.coerce.number().int().positive().default(4100),
        DATABASE_URL: z.string().min(1, "DATABASE_URL est requis."),
        JWT_SECRET: z.string().min(32, "JWT_SECRET doit contenir au moins 32 caractères."),
        WEB_ORIGIN: z.string().default("http://localhost:3100"),
        /**
         * Proxys autorisés à transmettre l'IP du joueur (X-Forwarded-For), au format Express :
         * « loopback » en local, « loopback,uniquelocal » quand le front tourne dans un autre conteneur.
         * Ne jamais exposer l'API directement sur Internet avec une valeur trop large.
         */
        TRUST_PROXY: z.string().default("loopback"),
        /** Adresse publique du site, utilisée dans les liens envoyés par e-mail. */
        APP_URL: z.string().url().default("http://localhost:3100"),
        LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
        /** Fuseau du changement d'énigme du jour (minuit local). */
        DAILY_TIMEZONE: z.string().default("Europe/Paris"),

        /** `log` : les e-mails sont écrits dans `.mail-outbox/` (développement) ; `smtp` : envoi réel. */
        MAIL_TRANSPORT: z.enum(["log", "smtp"]).default("log"),
        SMTP_URL: z.string().optional(),
        MAIL_FROM: z.string().default("AETHER <no-reply@aether.local>"),

        /** Un invité inactif depuis ce nombre de jours est supprimé avec sa progression. */
        GUEST_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
        /** Une partie non terminée depuis ce nombre de jours est supprimée. */
        OPEN_SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV !== "production") return;
        if (env.JWT_SECRET === EXAMPLE_JWT_SECRET) {
            ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: "La valeur d'exemple est interdite en production." });
        }
        if (env.MAIL_TRANSPORT === "smtp" && !env.SMTP_URL) {
            ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "SMTP_URL est requis avec MAIL_TRANSPORT=smtp." });
        }
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
