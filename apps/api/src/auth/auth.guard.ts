import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
    type CanActivate,
    type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role } from "@aether/shared";
import { IS_PUBLIC, ROLES } from "../common/auth.decorators";
import { AuthService } from "./auth.service";

/**
 * Garde globale : attache l'utilisateur de la session à chaque requête, exige une session
 * hors routes `@Public()`, puis vérifie les rôles `@Roles(...)`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly auth: AuthService,
    ) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const targets = [ctx.getHandler(), ctx.getClass()];

        const user = await this.auth.userFromRequest(req);
        if (user) req.user = user;

        if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
        if (!user) throw new UnauthorizedException("Session absente ou expirée.");

        const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
        if (roles?.length && !roles.includes(user.role)) {
            throw new ForbiddenException("Accès réservé aux gardiens du jardin.");
        }
        return true;
    }
}
