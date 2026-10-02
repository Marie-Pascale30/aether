import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import type { CookieOptions, Request, Response } from "express";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { isBetterResult, type LoginInput, type Me, type RegisterInput } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { ENV, type Env } from "../config/env";
import { MailService } from "../mail/mail.service";
import { resetPasswordMail, verifyEmailMail } from "../mail/templates";
import { PrismaService } from "../prisma/prisma.service";
import { AccountTokensService } from "./account-tokens.service";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "aether_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** `lastSeenAt` n'est réécrit qu'au-delà de ce délai : pas d'écriture en base à chaque requête. */
const LAST_SEEN_PRECISION_MS = 60 * 60 * 1000;

interface SessionPayload {
    sub: string;
    /** Version de session du compte à l'émission : un changement de mot de passe la périme. */
    v: number;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwt: JwtService,
        private readonly tokens: AccountTokensService,
        private readonly mail: MailService,
        @Inject(ENV) private readonly env: Env,
        @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
    ) {}

    // ─── Session ───────────────────────────────────────────────────────────

    /** Utilisateur porté par le cookie de session, ou `null` (absent, invalide, expiré, périmé, supprimé). */
    async userFromRequest(req: Request): Promise<AuthUser | null> {
        const token: unknown = req.cookies?.[SESSION_COOKIE];
        if (typeof token !== "string" || !token) return null;

        try {
            const { sub, v } = await this.jwt.verifyAsync<SessionPayload>(token);
            const user = await this.prisma.user.findUnique({ where: { id: sub } });
            if (!user || (v ?? 0) !== user.sessionVersion) return null;
            this.touch(user);
            return toAuthUser(user);
        } catch {
            return null;
        }
    }

    /** Note l'activité du joueur (sans faire attendre la requête, ni la faire échouer). */
    private touch(user: Pick<User, "id" | "lastSeenAt">) {
        if (Date.now() - user.lastSeenAt.getTime() < LAST_SEEN_PRECISION_MS) return;
        this.prisma.user
            .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
            .catch((error: unknown) => this.logger.warn({ err: error, userId: user.id }, "Mise à jour de lastSeenAt impossible"));
    }

    async openSession(res: Response, user: Pick<User, "id" | "sessionVersion">): Promise<void> {
        const token = await this.jwt.signAsync({ sub: user.id, v: user.sessionVersion } satisfies SessionPayload);
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

        const user = current?.isGuest
            ? await this.prisma.user.update({ where: { id: current.id }, data })
            : await this.prisma.user.create({ data });

        await this.sendVerification(user);
        return user;
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

    // ─── Adresse e-mail ────────────────────────────────────────────────────

    async verifyEmail(token: string): Promise<User> {
        const userId = await this.tokens.consume(token, "VERIFY_EMAIL");
        return this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    }

    async resendVerification(user: AuthUser): Promise<void> {
        if (user.isGuest || !user.email) throw new BadRequestException("Crée d'abord un compte avec une adresse e-mail.");
        if (user.emailVerified) return;
        const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        await this.sendVerification(record);
    }

    /** Un échec d'envoi ne doit pas faire échouer l'inscription : on le journalise, le joueur pourra renvoyer le lien. */
    private async sendVerification(user: User): Promise<void> {
        if (!user.email) return;
        try {
            const token = await this.tokens.issue(user.id, "VERIFY_EMAIL");
            await this.mail.send(verifyEmailMail(user.email, user.displayName, `${this.env.APP_URL}/verifier-email?token=${token}`));
        } catch (error) {
            this.logger.error({ err: error, userId: user.id }, "Envoi du lien de vérification impossible");
        }
    }

    // ─── Mot de passe ──────────────────────────────────────────────────────

    /** Toujours silencieux : la réponse ne révèle pas si un compte existe pour cette adresse. */
    async forgotPassword(email: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || !user.email) return;
        try {
            const token = await this.tokens.issue(user.id, "RESET_PASSWORD");
            await this.mail.send(resetPasswordMail(user.email, user.displayName, `${this.env.APP_URL}/reinitialiser?token=${token}`));
        } catch (error) {
            this.logger.error({ err: error, userId: user.id }, "Envoi du lien de réinitialisation impossible");
        }
    }

    /**
     * Nouveau mot de passe via le lien reçu : les autres sessions sont fermées, et l'adresse
     * est considérée comme confirmée (le lien prouve qu'on la reçoit).
     */
    async resetPassword(token: string, password: string): Promise<User> {
        const userId = await this.tokens.consume(token, "RESET_PASSWORD");
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: await hashPassword(password),
                sessionVersion: { increment: 1 },
                emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
            },
        });
    }

    async changePassword(user: AuthUser, currentPassword: string, newPassword: string): Promise<User> {
        const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        if (!record.passwordHash || !(await verifyPassword(currentPassword, record.passwordHash))) {
            throw new BadRequestException({
                statusCode: 400,
                message: ["Mot de passe actuel incorrect."],
                issues: [{ path: ["currentPassword"], message: "Mot de passe actuel incorrect." }],
            });
        }
        return this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: await hashPassword(newPassword), sessionVersion: { increment: 1 } },
        });
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

            // Résultats du jour : on garde ceux du compte, on reprend ceux de l'invité pour les autres jours.
            const ownDays = await tx.dailyResult.findMany({ where: { userId }, select: { date: true } });
            await tx.dailyResult.deleteMany({ where: { userId: guestId, date: { in: ownDays.map((row) => row.date) } } });
            await tx.dailyResult.updateMany({ where: { userId: guestId }, data: { userId } });

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
        emailVerified: user.emailVerifiedAt !== null,
        role: user.role,
        isGuest: user.isGuest,
    };
}

export function toMe(user: User | AuthUser): Me {
    return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        emailVerified: "emailVerified" in user ? user.emailVerified : user.emailVerifiedAt !== null,
        role: user.role,
        isGuest: user.isGuest,
    };
}
