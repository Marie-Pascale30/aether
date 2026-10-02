import { z } from "zod";
import { ACCOUNT_LIMITS, LEVEL_LIMITS as L } from "./constants";
import { validateLevelDefinition } from "./rules/levels";

// ─── Comptes ────────────────────────────────────────────────────────────────

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide."));

export const displayNameSchema = z
    .string()
    .trim()
    .min(ACCOUNT_LIMITS.displayNameMin, `Le pseudo doit contenir au moins ${ACCOUNT_LIMITS.displayNameMin} caractères.`)
    .max(ACCOUNT_LIMITS.displayNameMax, `Le pseudo ne peut pas dépasser ${ACCOUNT_LIMITS.displayNameMax} caractères.`);

export const registerSchema = z.object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: z
        .string()
        .min(ACCOUNT_LIMITS.passwordMin, `Le mot de passe doit contenir au moins ${ACCOUNT_LIMITS.passwordMin} caractères.`)
        .max(ACCOUNT_LIMITS.passwordMax, "Mot de passe trop long."),
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Mot de passe requis."),
});

export const updateProfileSchema = z.object({
    displayName: displayNameSchema,
});

// ─── Partie ─────────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
    /** Abandonne la partie en cours sur ce niveau et en démarre une neuve. */
    restart: z.boolean().optional(),
});

export const attemptSchema = z
    .object({
        a: z.number().int().min(0),
        b: z.number().int().min(0),
    })
    .refine((attempt) => attempt.a !== attempt.b, "Choisis deux éléments différents.");

export const leaderboardQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Éditeur de niveaux ─────────────────────────────────────────────────────

const pairSchema = z.tuple([z.number().int().min(0), z.number().int().min(0)]);

export const levelInputSchema = z
    .object({
        title: z.string().trim().min(1, "Le titre est requis.").max(L.titleMax, `${L.titleMax} caractères maximum.`),
        description: z
            .string()
            .trim()
            .min(1, "La description est requise.")
            .max(L.descriptionMax, `${L.descriptionMax} caractères maximum.`),
        hints: z
            .array(z.string().trim().min(1, "Un indice ne peut pas être vide.").max(L.hintMax))
            .min(L.hintsMin, "Ajoute au moins un indice.")
            .max(L.hintsMax, `${L.hintsMax} indices maximum.`),
        symbols: z
            .array(z.string().trim().min(1, "Un symbole ne peut pas être vide.").max(L.symbolMax))
            .min(L.symbolsMin, `Au moins ${L.symbolsMin} symboles.`)
            .max(L.symbolsMax, `${L.symbolsMax} symboles maximum.`),
        columns: z.number().int().min(L.columnsMin).max(L.columnsMax),
        pairs: z.array(pairSchema).min(1, "Définis au moins une paire à relier."),
        published: z.boolean(),
    })
    .superRefine((level, ctx) => {
        for (const issue of validateLevelDefinition(level)) {
            ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
        }
    });

export const reorderLevelsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
export type LevelInput = z.infer<typeof levelInputSchema>;
export type ReorderLevelsInput = z.infer<typeof reorderLevelsSchema>;
