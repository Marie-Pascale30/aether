import type {
    AdminLevel,
    AdminWorld,
    ApiErrorBody,
    CompletionResult,
    ContentBundle,
    DailyState,
    LevelResultInput,
    MilestonesView,
    LevelDetail,
    LevelDesignStats,
    LevelInput,
    LoginInput,
    Me,
    PlayerStats,
    RegisterInput,
    SyncState,
    WorldInput,
} from "@aether/shared";

export type ApiIssue = NonNullable<ApiErrorBody["issues"]>[number];

export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
        readonly issues: ApiIssue[] = [],
    ) {
        super(message);
        this.name = "ApiError";
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`/api${path}`, {
            method,
            headers: body === undefined ? undefined : { "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: "same-origin",
        });
    } catch {
        throw new ApiError(0, "Le jardin est injoignable. Vérifie ta connexion.");
    }

    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
        const error = (data ?? {}) as Partial<ApiErrorBody>;
        const message = Array.isArray(error.message) ? error.message.join(" ") : error.message;
        throw new ApiError(res.status, message ?? "Une erreur inattendue est survenue.", error.issues);
    }
    return data as T;
}

/** Toutes les routes de l'API, typées par le contrat de `@aether/shared`. */
export const api = {
    auth: {
        me: async () => (await request<{ me: Me | null }>("GET", "/auth/me")).me,
        guest: () => request<Me>("POST", "/auth/guest"),
        register: (input: RegisterInput) => request<Me>("POST", "/auth/register", input),
        login: (input: LoginInput) => request<Me>("POST", "/auth/login", input),
        logout: () => request<void>("POST", "/auth/logout"),
        updateMe: (displayName: string) => request<Me>("PATCH", "/auth/me", { displayName }),
        verifyEmail: (token: string) => request<Me>("POST", "/auth/email/verify", { token }),
        resendVerification: () => request<void>("POST", "/auth/email/resend"),
        forgotPassword: (email: string) => request<void>("POST", "/auth/password/forgot", { email }),
        resetPassword: (token: string, password: string) => request<Me>("POST", "/auth/password/reset", { token, password }),
        changePassword: (currentPassword: string, newPassword: string) =>
            request<Me>("PATCH", "/auth/password", { currentPassword, newPassword }),
    },
    levels: {
        get: (id: string) => request<LevelDetail>("GET", `/levels/${id}`),
    },
    /** Tout le contenu publié, gardé sur l'appareil pour jouer hors ligne. */
    content: () => request<ContentBundle>("GET", "/content"),
    play: {
        /** Victoire sur une énigme jouée sur l'appareil (renvoi idempotent grâce à `resultId`). */
        result: (levelId: string, input: LevelResultInput) => request<CompletionResult>("POST", `/levels/${levelId}/results`, input),
    },
    me: {
        sync: () => request<SyncState>("GET", "/me/sync"),
        stats: () => request<PlayerStats>("GET", "/me/stats"),
        milestones: () => request<MilestonesView>("GET", "/me/milestones"),
    },
    daily: () => request<DailyState>("GET", "/daily"),
    admin: {
        levels: () => request<AdminLevel[]>("GET", "/admin/levels"),
        level: (id: string) => request<AdminLevel>("GET", `/admin/levels/${id}`),
        levelStats: (id: string) => request<LevelDesignStats>("GET", `/admin/levels/${id}/stats`),
        create: (input: LevelInput) => request<AdminLevel>("POST", "/admin/levels", input),
        update: (id: string, input: LevelInput) => request<AdminLevel>("PUT", `/admin/levels/${id}`, input),
        remove: (id: string) => request<void>("DELETE", `/admin/levels/${id}`),
        duplicate: (id: string) => request<AdminLevel>("POST", `/admin/levels/${id}/duplicate`),
        reorder: (worldId: string, ids: string[]) => request<AdminLevel[]>("POST", "/admin/levels/reorder", { worldId, ids }),
        worlds: () => request<AdminWorld[]>("GET", "/admin/worlds"),
        createWorld: (input: WorldInput) => request<AdminWorld>("POST", "/admin/worlds", input),
        updateWorld: (id: string, input: WorldInput) => request<AdminWorld>("PUT", `/admin/worlds/${id}`, input),
        removeWorld: (id: string) => request<void>("DELETE", `/admin/worlds/${id}`),
        reorderWorlds: (ids: string[]) => request<AdminWorld[]>("POST", "/admin/worlds/reorder", { ids }),
    },
};
