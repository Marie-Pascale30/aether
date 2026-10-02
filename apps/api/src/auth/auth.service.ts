import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { CookieOptions, Request, Response } from "express";
import { isBetterResult, type LoginInput, type Me, type RegisterInput } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "aether_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface SessionPayload {
    sub: string;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        @Inject(ENV) private readonly env: Env,
    ) {}

    // ─── Session ───────────────────────────────────────────────────────────

    /** Utilisateur porté par le cookie de session, ou `null` (absent, invalide, expiré, supprimé). */
    async userFromRequest(req: Request): Promise<AuthUser | null> {
        const token: unknown = req.cookies?.[SESSION_COOKIE];
        if (typeof token !== "string" || !token) return null;

        try {
            const { sub } = await this.jwt.verifyAsync<SessionPayload>(token);
            const user = await this.prisma.user.findUnique({ where: { id: sub } });
            return user ? toAuthUser(user) : null;
        } catch {
            return null;
        }
    }

    async openSession(res: Response, user: Pick<User, "id">): Promise<void> {
        const token = await this.jwt.signAsync({ sub: user.id } satisfies SessionPayload);
        res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), maxAge: SESSION_TTL_MS });
    }

    closeSession(res: Response): void {
        res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    }

    private cookieOptions(): CookieOptions {
        return { httpOnly: true, sameSite: "lax", secure: this.env.NODE_ENV === "production", path: "/" };
    }

    // ─── Comptes ───────────────────────────────────────────────────────────

    async createGuest(): Promise<User> {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        return this.prisma.user.create({ data: { displayName: `Voyageur ${suffix}`, isGuest: true } });
    }

    /**
     * Crée un compte. Si la requête vient d'un invité, c'est ce même joueur qui devient
     * un compte complet : sa progression est conservée telle quelle.
     */
    async register(input: RegisterInput, current?: AuthUser): Promise<User> {
        if (await this.prisma.user.findUnique({ where: { email: input.email } })) {
            throw new ConflictException("Cette adresse e-mail est déjà utilisée.");
        }

        const data = {
            email: input.email,
            displayName: input.displayName,
            passwordHash: await hashPassword(input.password),
            isGuest: false,
        };

        return current?.isGuest
            ? this.prisma.user.update({ where: { id: current.id }, data })
            : this.prisma.user.create({ data });
    }

    /** Connecte un compte existant. Un invité qui se connecte y rapporte sa progression. */
    async login(input: LoginInput, current?: AuthUser): Promise<User> {
        const user = await this.prisma.user.findUnique({ where: { email: input.email } });
        const valid = user?.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false;
        if (!user || !valid) throw new UnauthorizedException("E-mail ou mot de passe incorrect.");

        if (current?.isGuest && current.id !== user.id) await this.mergeGuestInto(current.id, user.id);
        return user;
    }

    async updateDisplayName(userId: string, displayName: string): Promise<User> {
        return this.prisma.user.update({ where: { id: userId }, data: { displayName } });
    }

    /** Garde, énigme par énigme, le meilleur des deux résultats, puis supprime le compte invité. */
    private async mergeGuestInto(guestId: string, userId: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const guestProgress = await tx.levelProgress.findMany({ where: { userId: guestId } });

            for (const progress of guestProgress) {
                const key = { userId_levelId: { userId, levelId: progress.levelId } };
                const existing = await tx.levelProgress.findUnique({ where: key });

                if (!existing) {
                    await tx.levelProgress.create({ data: { ...progress, userId } });
                    continue;
                }

                const guestIsBetter = isBetterResult(
                    { stars: progress.bestStars, durationMs: progress.bestTimeMs },
                    { stars: existing.bestStars, durationMs: existing.bestTimeMs },
                );
                await tx.levelProgress.update({
                    where: key,
                    data: {
                        completions: existing.completions + progress.completions,
                        firstCompletedAt:
                            progress.firstCompletedAt < existing.firstCompletedAt
                                ? progress.firstCompletedAt
                                : existing.firstCompletedAt,
                        ...(guestIsBetter && { bestStars: progress.bestStars, bestTimeMs: progress.bestTimeMs }),
                    },
                });
            }

            await tx.playSession.updateMany({ where: { userId: guestId }, data: { userId } });
            await tx.user.delete({ where: { id: guestId } });
        });
    }
}

export function toAuthUser(user: User): AuthUser {
    return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isGuest: user.isGuest,
    };
}

export function toMe(user: User | AuthUser): Me {
    return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        isGuest: user.isGuest,
    };
}
