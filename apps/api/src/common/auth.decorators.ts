import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { Role } from "@aether/shared";

export interface AuthUser {
    id: string;
    displayName: string;
    email: string | null;
    role: Role;
    isGuest: boolean;
}

declare module "express-serve-static-core" {
    interface Request {
        user?: AuthUser;
    }
}

export const IS_PUBLIC = "aether:isPublic";
export const ROLES = "aether:roles";

/** Route accessible sans session (l'utilisateur est tout de même attaché s'il en a une). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restreint la route (ou le contrôleur) aux rôles donnés. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/** Utilisateur de la requête. Garanti sur les routes non publiques, optionnel sur les routes `@Public()`. */
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().user,
);
