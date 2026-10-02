import type {
    AdminLevel,
    ApiErrorBody,
    AttemptResult,
    HintResult,
    Leaderboard,
    LevelDetail,
    LevelInput,
    LevelSummary,
    LoginInput,
    Me,
    PlayerStats,
    ProgressSummary,
    RegisterInput,
    SessionState,
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
    },
    levels: {
        list: () => request<LevelSummary[]>("GET", "/levels"),
        get: (id: string) => request<LevelDetail>("GET", `/levels/${id}`),
    },
    play: {
        start: (levelId: string, restart = false) =>
            request<SessionState>("POST", `/levels/${levelId}/sessions`, { restart }),
        attempt: (sessionId: string, a: number, b: number) =>
            request<AttemptResult>("POST", `/sessions/${sessionId}/attempts`, { a, b }),
        hint: (sessionId: string) => request<HintResult>("POST", `/sessions/${sessionId}/hints`),
    },
    me: {
        progress: () => request<ProgressSummary>("GET", "/me/progress"),
        stats: () => request<PlayerStats>("GET", "/me/stats"),
    },
    leaderboard: (limit = 20) => request<Leaderboard>("GET", `/leaderboard?limit=${limit}`),
    admin: {
        levels: () => request<AdminLevel[]>("GET", "/admin/levels"),
        level: (id: string) => request<AdminLevel>("GET", `/admin/levels/${id}`),
        create: (input: LevelInput) => request<AdminLevel>("POST", "/admin/levels", input),
        update: (id: string, input: LevelInput) => request<AdminLevel>("PUT", `/admin/levels/${id}`, input),
        remove: (id: string) => request<void>("DELETE", `/admin/levels/${id}`),
        reorder: (ids: string[]) => request<AdminLevel[]>("POST", "/admin/levels/reorder", { ids }),
    },
};
