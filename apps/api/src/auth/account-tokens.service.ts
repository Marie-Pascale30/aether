import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { AuthTokenKind } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export const TOKEN_TTL_MS: Record<AuthTokenKind, number> = {
    VERIFY_EMAIL: 48 * 60 * 60 * 1000,
    RESET_PASSWORD: 60 * 60 * 1000,
};

const INVALID = "Ce lien n'est plus valide (déjà utilisé ou expiré). Demande-en un nouveau.";

/**
 * Jetons à usage unique envoyés par e-mail. Seule leur empreinte est stockée : une fuite
 * de la base ne permet pas de les rejouer.
 */
@Injectable()
export class AccountTokensService {
    constructor(private readonly prisma: PrismaService) {}

    /** Émet un jeton et invalide les précédents du même type pour ce joueur. */
    async issue(userId: string, kind: AuthTokenKind): Promise<string> {
        const token = randomBytes(32).toString("base64url");
        await this.prisma.$transaction([
            this.prisma.authToken.deleteMany({ where: { userId, kind, usedAt: null } }),
            this.prisma.authToken.create({
                data: { userId, kind, tokenHash: hash(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]) },
            }),
        ]);
        return token;
    }

    /** Consomme un jeton valide et renvoie son propriétaire. Un jeton ne sert qu'une fois, même en cas de double clic. */
    async consume(token: string, kind: AuthTokenKind): Promise<string> {
        const record = await this.prisma.authToken.findUnique({ where: { tokenHash: hash(token) } });
        if (!record || record.kind !== kind || record.usedAt || record.expiresAt < new Date()) {
            throw new BadRequestException(INVALID);
        }
        const { count } = await this.prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
        if (count === 0) throw new BadRequestException(INVALID);
        return record.userId;
    }
}
