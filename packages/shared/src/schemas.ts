import { z } from "zod";
import { ACCOUNT_LIMITS, GROUP_SIZE, LEVEL_LIMITS as L, WORLD_THEMES } from "./constants";
import { MECHANICS, validatePuzzle, type LocalMechanic } from "./mechanics";
import { PUZZLE_SCHEMAS } from "./mechanics/schemas";
import { validateLevelDefinition } from "./rules/levels";

// ─── Comptes ────────────────────────────────────────────────────────────────

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide."));

export const displayNameSchema = z
    .string()
    .trim()
    .min(ACCOUNT_LIMITS.displayNameMin, `Le pseudo doit contenir au moins ${ACCOUNT_LIMITS.displayNameMin} caractères.`)
    .max(ACCOUNT_LIMITS.displayNameMax, `Le pseudo ne peut pas dépasser ${ACCOUNT_LIMITS.displayNameMax} caractères.`);

const passwordSchema = z
    .string()
    .min(ACCOUNT_LIMITS.passwordMin, `Le mot de passe doit contenir au moins ${ACCOUNT_LIMITS.passwordMin} caractères.`)
    .max(ACCOUNT_LIMITS.passwordMax, "Mot de passe trop long.");

export const registerSchema = z.object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Mot de passe requis."),
});

export const updateProfileSchema = z.object({
    displayName: displayNameSchema,
});

/** Jeton reçu par e-mail (vérification d'adresse ou réinitialisation). */
const tokenSchema = z.string().min(20, "Lien invalide.").max(200, "Lien invalide.");

export const verifyEmailSchema = z.object({ token: tokenSchema });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({ token: tokenSchema, password: passwordSchema });

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Mot de passe actuel requis."),
        newPassword: passwordSchema,
    })
    .refine((input) => input.currentPassword !== input.newPassword, {
        path: ["newPassword"],
        message: "Le nouveau mot de passe doit différer de l'actuel.",
    });

// ─── Partie ─────────────────────────────────────────────────────────────────

export const startSessionSchema = z.object({
    /** Abandonne la partie en cours sur ce niveau et en démarre une neuve. */
    restart: z.boolean().optional(),
});

/** Cases choisies pour former un lien, dans l'ordre de sélection (significatif pour une suite). */
export const attemptSchema = z.object({
    cells: z
        .array(z.number().int().min(0))
        .min(GROUP_SIZE.PAIRS.min)
        .max(GROUP_SIZE.SEQUENCE.max)
        .refine((cells) => new Set(cells).size === cells.length, "Choisis des éléments différents."),
});

// ─── Éditeur de niveaux ─────────────────────────────────────────────────────

const groupSchema = z.array(z.number().int().min(0)).min(GROUP_SIZE.PAIRS.min).max(GROUP_SIZE.SEQUENCE.max);

export const levelInputSchema = z
    .object({
        worldId: z.string().min(1, "Choisis un monde."),
        mechanic: z.enum(MECHANICS).default("LINKS"),
        /** Plateau des mécaniques jouées sur l'appareil ; `null` pour les Liens. */
        puzzle: z.unknown().nullable().default(null),
        kind: z.enum(["PAIRS", "GROUPS", "SEQUENCE"]).default("PAIRS"),
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
        // Plateau des Liens (vides pour les autres mécaniques).
        symbols: z
            .array(z.string().trim().min(1, "Un symbole ne peut pas être vide.").max(L.symbolMax))
            .max(L.symbolsMax, `${L.symbolsMax} symboles maximum.`)
            .default([]),
        columns: z.number().int().min(L.columnsMin).max(L.columnsMax).default(4),
        groups: z.array(groupSchema).default([]),
        published: z.boolean(),
    })
    .superRefine((level, ctx) => {
        const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

        if (level.mechanic === "LINKS") {
            if (level.symbols.length < L.symbolsMin) issue(["symbols"], `Au moins ${L.symbolsMin} symboles.`);
            if (level.groups.length === 0) issue(["groups"], "Définis au moins un lien à trouver.");
            for (const found of validateLevelDefinition(level)) issue(found.path, found.message);
            return;
        }

        const mechanic = level.mechanic as LocalMechanic;
        const shape = PUZZLE_SCHEMAS[mechanic].safeParse(level.puzzle);
        if (!shape.success) {
            for (const found of shape.error.issues) issue(["puzzle", ...found.path.filter((k): k is string | number => typeof k !== "symbol")], `Plateau : ${found.message}`);
            return;
        }
        for (const found of validatePuzzle(mechanic, shape.data as never)) issue(["puzzle", ...found.path], found.message);
    });

/** Résultat d'une énigme jouée sur l'appareil (Mémoires, Rouages, Flux, Échos). */
export const levelResultSchema = z.object({
    /** Durée réelle de la partie ; plafonnée à 6 h. */
    durationMs: z.number().int().min(0).max(6 * 60 * 60 * 1000),
    mistakes: z.number().int().min(0).max(999),
    hintsUsed: z.number().int().min(0).max(L.hintsMax),
});

/** Nouvel ordre des énigmes d'un monde : `ids` liste exactement toutes ses énigmes. */
export const reorderLevelsSchema = z.object({
    worldId: z.string().min(1),
    ids: z.array(z.string().min(1)).min(1),
});

export const worldInputSchema = z.object({
    slug: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets uniquement (ex. foret-des-echos).")
        .max(40),
    title: z.string().trim().min(1, "Le titre est requis.").max(60),
    tagline: z.string().trim().min(1, "Une phrase d'accroche est requise.").max(120),
    description: z.string().trim().min(1, "La description est requise.").max(400),
    theme: z.enum(WORLD_THEMES),
    published: z.boolean(),
    /** Réserve de l'énigme du jour : le monde n'apparaît pas dans le parcours. */
    isDaily: z.boolean().default(false),
});

export const reorderWorldsSchema = z.object({
    ids: z.array(z.string().min(1)).min(1),
});

// ─── Observabilité ──────────────────────────────────────────────────────────

/** Erreur JavaScript remontée par le navigateur (tailles bornées : la route est publique). */
export const clientErrorSchema = z.object({
    kind: z.enum(["error", "unhandledrejection", "boundary"]),
    message: z.string().max(2000),
    stack: z.string().max(8000).optional(),
    url: z.string().max(2000),
    digest: z.string().max(200).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;
export type LevelInput = z.infer<typeof levelInputSchema>;
export type LevelResultInput = z.infer<typeof levelResultSchema>;
export type ReorderLevelsInput = z.infer<typeof reorderLevelsSchema>;
export type WorldInput = z.infer<typeof worldInputSchema>;
export type ReorderWorldsInput = z.infer<typeof reorderWorldsSchema>;
export type ClientErrorInput = z.infer<typeof clientErrorSchema>;
