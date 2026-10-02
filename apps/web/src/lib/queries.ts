"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LevelInput, LoginInput, Me, RegisterInput } from "@aether/shared";
import { api, ApiError } from "./api";
import { signedOut } from "./signedOut";

export const keys = {
    me: ["me"] as const,
    levels: ["levels"] as const,
    level: (id: string) => ["levels", id] as const,
    progress: ["me", "progress"] as const,
    stats: ["me", "stats"] as const,
    leaderboard: ["leaderboard"] as const,
    adminLevels: ["admin", "levels"] as const,
    adminLevel: (id: string) => ["admin", "levels", id] as const,
};

// ─── Session ────────────────────────────────────────────────────────────────

/** Joueur courant ; `null` s'il n'a pas encore de session. */
export function useMe() {
    return useQuery({ queryKey: keys.me, queryFn: api.auth.me, staleTime: 5 * 60_000 });
}

/** Après un changement d'identité, toutes les données en cache appartiennent à l'ancien joueur. */
function useSwitchIdentity() {
    const qc = useQueryClient();
    return (me: Me | null) => {
        signedOut.set(me === null);
        qc.removeQueries({ predicate: (query) => query.queryKey[0] !== keys.me[0] });
        qc.setQueryData(keys.me, me);
    };
}

export function useStartAsGuest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: api.auth.guest,
        onSuccess: (me) => {
            signedOut.set(false);
            qc.setQueryData(keys.me, me);
        },
    });
}

export function useLogin() {
    const switchIdentity = useSwitchIdentity();
    return useMutation({ mutationFn: (input: LoginInput) => api.auth.login(input), onSuccess: switchIdentity });
}

export function useRegister() {
    const switchIdentity = useSwitchIdentity();
    return useMutation({ mutationFn: (input: RegisterInput) => api.auth.register(input), onSuccess: switchIdentity });
}

export function useLogout() {
    const switchIdentity = useSwitchIdentity();
    return useMutation({ mutationFn: api.auth.logout, onSuccess: () => switchIdentity(null) });
}

export function useUpdateDisplayName() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (displayName: string) => api.auth.updateMe(displayName),
        onSuccess: (me) => {
            qc.setQueryData(keys.me, me);
            void qc.invalidateQueries({ queryKey: keys.leaderboard });
        },
    });
}

// ─── Jeu ────────────────────────────────────────────────────────────────────

export function useLevels(enabled = true) {
    return useQuery({ queryKey: keys.levels, queryFn: api.levels.list, enabled });
}

export function useLevel(id: string) {
    return useQuery({ queryKey: keys.level(id), queryFn: () => api.levels.get(id), retry: noRetryOn4xx });
}

export function useProgress(enabled = true) {
    return useQuery({ queryKey: keys.progress, queryFn: api.me.progress, enabled });
}

export function useStats() {
    return useQuery({ queryKey: keys.stats, queryFn: api.me.stats });
}

export function useLeaderboard(limit = 20) {
    return useQuery({ queryKey: [...keys.leaderboard, limit], queryFn: () => api.leaderboard(limit) });
}

/** À appeler quand une énigme est résolue : tout ce qui dépend de la progression est périmé. */
export function useInvalidateProgress() {
    const qc = useQueryClient();
    return () =>
        Promise.all(
            [keys.levels, keys.progress, keys.stats, keys.leaderboard].map((queryKey) =>
                qc.invalidateQueries({ queryKey }),
            ),
        );
}

// ─── Administration ─────────────────────────────────────────────────────────

export function useAdminLevels() {
    return useQuery({ queryKey: keys.adminLevels, queryFn: api.admin.levels });
}

export function useAdminLevel(id: string) {
    return useQuery({ queryKey: keys.adminLevel(id), queryFn: () => api.admin.level(id), retry: noRetryOn4xx });
}

function useAdminMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn,
        // Le parcours des joueurs dépend aussi des niveaux : on invalide les deux côtés.
        onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: keys.levels })]),
    });
}

export const useCreateLevel = () => useAdminMutation((input: LevelInput) => api.admin.create(input));
export const useUpdateLevel = () =>
    useAdminMutation(({ id, input }: { id: string; input: LevelInput }) => api.admin.update(id, input));
export const useDeleteLevel = () => useAdminMutation((id: string) => api.admin.remove(id));
export const useReorderLevels = () => useAdminMutation((ids: string[]) => api.admin.reorder(ids));

function noRetryOn4xx(failureCount: number, error: Error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
    return failureCount < 2;
}
