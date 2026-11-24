import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
    changePasswordSchema,
    deleteAccountSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    updateProfileSchema,
    verifyEmailSchema,
    type ChangePasswordInput,
    type DeleteAccountInput,
    type ForgotPasswordInput,
    type LoginInput,
    type Me,
    type RegisterInput,
    type ResetPasswordInput,
    type UpdateProfileInput,
    type VerifyEmailInput,
} from "@aether/shared";
import { CurrentUser, Public, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { AuthService, toMe } from "./auth.service";

/** Limite stricte sur les routes sensibles au bourrage d'identifiants. */
const STRICT = { default: { limit: 10, ttl: 60_000 } };
/** Routes qui envoient un e-mail : pas plus de quelques envois par minute. */
const MAILING = { default: { limit: 3, ttl: 60_000 } };
/**
 * Inscription : le refus « adresse déjà utilisée » est nécessaire à l'expérience (la session s'ouvre
 * aussitôt), il révèle donc qu'un compte existe. On le borne : 10 par minute et 20 par heure par IP.
 */
const REGISTER = { default: { limit: 10, ttl: 60_000 }, hourly: { limit: 20, ttl: 60 * 60_000 } };

@Controller("auth")
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    /** Ouvre une session invité (ou renvoie la session existante). */
    @Public()
    @Throttle(STRICT)
    @Post("guest")
    async guest(@CurrentUser() current: AuthUser | undefined, @Res({ passthrough: true }) res: Response): Promise<Me> {
        if (current) return toMe(current);
        const user = await this.auth.createGuest();
        await this.auth.openSession(res, user);
        return toMe(user);
    }

    @Public()
    @Throttle(REGISTER)
    @Post("register")
    async register(
        @Body(new ZodPipe(registerSchema)) body: RegisterInput,
        @CurrentUser() current: AuthUser | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Me> {
        const user = await this.auth.register(body, current);
        await this.auth.openSession(res, user);
        return toMe(user);
    }

    @Public()
    @Throttle(STRICT)
    @Post("login")
    @HttpCode(200)
    async login(
        @Body(new ZodPipe(loginSchema)) body: LoginInput,
        @CurrentUser() current: AuthUser | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Me> {
        const user = await this.auth.login(body, current);
        await this.auth.openSession(res, user);
        return toMe(user);
    }

    /** Ferme la session et révoque le jeton (sur tous les appareils du compte). */
    @Public()
    @Post("logout")
    @HttpCode(204)
    logout(@CurrentUser() user: AuthUser | undefined, @Res({ passthrough: true }) res: Response): Promise<void> {
        return this.auth.closeSession(res, user);
    }

    @Public()
    @Throttle(STRICT)
    @Post("email/verify")
    @HttpCode(200)
    async verifyEmail(@Body(new ZodPipe(verifyEmailSchema)) body: VerifyEmailInput): Promise<Me> {
        return toMe(await this.auth.verifyEmail(body.token));
    }

    @Throttle(MAILING)
    @Post("email/resend")
    @HttpCode(204)
    resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
        return this.auth.resendVerification(user);
    }

    /** Répond toujours 204 : on ne révèle pas si un compte existe pour cette adresse. */
    @Public()
    @Throttle(MAILING)
    @Post("password/forgot")
    @HttpCode(204)
    forgotPassword(@Body(new ZodPipe(forgotPasswordSchema)) body: ForgotPasswordInput): Promise<void> {
        return this.auth.forgotPassword(body.email);
    }

    @Public()
    @Throttle(STRICT)
    @Post("password/reset")
    @HttpCode(200)
    async resetPassword(
        @Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Me> {
        const user = await this.auth.resetPassword(body.token, body.password);
        await this.auth.openSession(res, user);
        return toMe(user);
    }

    /** Les autres appareils sont déconnectés ; celui-ci reçoit une session neuve. */
    @Throttle(STRICT)
    @Patch("password")
    async changePassword(
        @CurrentUser() user: AuthUser,
        @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Me> {
        const updated = await this.auth.changePassword(user, body.currentPassword, body.newPassword);
        await this.auth.openSession(res, updated);
        return toMe(updated);
    }

    /** Joueur courant, ou `null` sans session (pas une erreur : c'est l'état d'un nouveau visiteur). */
    @Public()
    @Get("me")
    me(@CurrentUser() user: AuthUser | undefined): { me: Me | null } {
        return { me: user ? toMe(user) : null };
    }

    /** Droit à l'effacement (RGPD, art. 17) : le compte et toutes ses données, puis la session. */
    @Throttle(STRICT)
    @Delete("me")
    @HttpCode(204)
    async deleteMe(
        @CurrentUser() user: AuthUser,
        @Body(new ZodPipe(deleteAccountSchema)) body: DeleteAccountInput,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        await this.auth.deleteAccount(user, body.password);
        await this.auth.closeSession(res);
    }

    @Patch("me")
    async updateMe(
        @CurrentUser() user: AuthUser,
        @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput,
    ): Promise<Me> {
        return toMe(await this.auth.updateDisplayName(user.id, body.displayName));
    }
}
