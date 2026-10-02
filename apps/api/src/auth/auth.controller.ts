import { Body, Controller, Get, HttpCode, Patch, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
    loginSchema,
    registerSchema,
    updateProfileSchema,
    type LoginInput,
    type Me,
    type RegisterInput,
    type UpdateProfileInput,
} from "@aether/shared";
import { CurrentUser, Public, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { AuthService, toMe } from "./auth.service";

/** Limite stricte sur les routes sensibles au bourrage d'identifiants. */
const STRICT = { default: { limit: 10, ttl: 60_000 } };

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
    @Throttle(STRICT)
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

    @Public()
    @Post("logout")
    @HttpCode(204)
    logout(@Res({ passthrough: true }) res: Response): void {
        this.auth.closeSession(res);
    }

    /** Joueur courant, ou `null` sans session (pas une erreur : c'est l'état d'un nouveau visiteur). */
    @Public()
    @Get("me")
    me(@CurrentUser() user: AuthUser | undefined): { me: Me | null } {
        return { me: user ? toMe(user) : null };
    }

    @Patch("me")
    async updateMe(
        @CurrentUser() user: AuthUser,
        @Body(new ZodPipe(updateProfileSchema)) body: UpdateProfileInput,
    ): Promise<Me> {
        return toMe(await this.auth.updateDisplayName(user.id, body.displayName));
    }
}
