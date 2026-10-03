"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LevelInput, LoginInput, Me, RegisterInput, WorldInput } from "@aether/shared";
import { api, ApiError } from "./api";
import { outbox } from "./offline/outbox";
import { signedOut } from "./signedOut";

export const keys = {
    me: ["me"] as const,
    /** Contenu publié (persisté sur l'appareil). */
    content: ["content"] as const,
    /** Progression connue du serveur (persistée sur l'appareil). */
    sync: ["me", "sync"] as const,
    level: (id: string) => ["levels", id] as const,
    stats: ["me", "stats"] as const,
    milestones: ["me", "milestones"] as const,
    daily: ["daily"] as const,
    adminLevels: ["admin", "levels"] as const,
    adminLevel: (id: string) => ["admin", "levels", id] as const,
    adminWorlds: ["admin", "worlds"] as const,
    adminLevelStats: (id: string) => ["admin", "levels", id, "stats"] as const,
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
        // Les victoires d'un invité encore en attente suivent le compte auquel il se connecte.
        const previous = qc.getQueryData<Me | null>(keys.me);
        if (previous?.isGuest && me) outbox.reassign(previous.id, me.id);
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
        },
    });
}

export function useVerifyEmail() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (token: string) => api.auth.verifyEmail(token),
        // Le lien peut être ouvert sur un autre appareil : on ne met à jour que si c'est le même joueur.
        onSuccess: (me) => {
            const current = qc.getQueryData<Me | null>(keys.me);
            if (current?.id === me.id) qc.setQueryData(keys.me, me);
        },
    });
}

export const useResendVerification = () => useMutation({ mutationFn: api.auth.resendVerification });

export const useForgotPassword = () => useMutation({ mutationFn: (email: string) => api.auth.forgotPassword(email) });

/** La réinitialisation ouvre une session sur ce compte : comme une connexion. */
export function useResetPassword() {
    const switchIdentity = useSwitchIdentity();
    return useMutation({
        mutationFn: ({ token, password }: { token: string; password: string }) => api.auth.resetPassword(token, password),
        onSuccess: switchIdentity,
    });
}

export function useChangePassword() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
            api.auth.changePassword(currentPassword, newPassword),
        onSuccess: (me) => qc.setQueryData(keys.me, me),
    });
}

// ─── Jeu ────────────────────────────────────────────────────────────────────

/** Énigme hors contenu embarqué (brouillon d'administrateur, énigme du jour) : demandée au serveur. */
export function useLevel(id: string, enabled = true) {
    return useQuery({ queryKey: keys.level(id), queryFn: () => api.levels.get(id), retry: noRetryOn4xx, enabled });
}

export function useStats() {
    return useQuery({ queryKey: keys.stats, queryFn: api.me.stats });
}

export function useDaily() {
    return useQuery({ queryKey: keys.daily, queryFn: api.daily });
}

export function useMilestones() {
    return useQuery({ queryKey: keys.milestones, queryFn: api.me.milestones });
}

// ─── Administration ─────────────────────────────────────────────────────────

export function useAdminLevels() {
    return useQuery({ queryKey: keys.adminLevels, queryFn: api.admin.levels });
}

export function useAdminLevel(id: string) {
    return useQuery({ queryKey: keys.adminLevel(id), queryFn: () => api.admin.level(id), retry: noRetryOn4xx });
}

export function useAdminLevelStats(id: string) {
    return useQuery({ queryKey: keys.adminLevelStats(id), queryFn: () => api.admin.levelStats(id), staleTime: 60_000 });
}

function useAdminMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn,
        // Le parcours des joueurs dépend aussi des niveaux : on invalide les deux côtés.
        onSuccess: () =>
            Promise.all(
                [["admin"], keys.content, ["levels"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
            ),
    });
}

export const useCreateLevel = () => useAdminMutation((input: LevelInput) => api.admin.create(input));
export const useUpdateLevel = () =>
    useAdminMutation(({ id, input }: { id: string; input: LevelInput }) => api.admin.update(id, input));
export const useDeleteLevel = () => useAdminMutation((id: string) => api.admin.remove(id));
export const useDuplicateLevel = () => useAdminMutation((id: string) => api.admin.duplicate(id));
export const useReorderLevels = () =>
    useAdminMutation(({ worldId, ids }: { worldId: string; ids: string[] }) => api.admin.reorder(worldId, ids));

export function useAdminWorlds() {
    return useQuery({ queryKey: keys.adminWorlds, queryFn: api.admin.worlds });
}

export const useCreateWorld = () => useAdminMutation((input: WorldInput) => api.admin.createWorld(input));
export const useUpdateWorld = () =>
    useAdminMutation(({ id, input }: { id: string; input: WorldInput }) => api.admin.updateWorld(id, input));
export const useDeleteWorld = () => useAdminMutation((id: string) => api.admin.removeWorld(id));
export const useReorderWorlds = () => useAdminMutation((ids: string[]) => api.admin.reorderWorlds(ids));

function noRetryOn4xx(failureCount: number, error: Error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
    return failureCount < 2;
}
