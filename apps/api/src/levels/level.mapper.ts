import { InternalServerErrorException } from "@nestjs/common";
import type { Level, Prisma } from "@prisma/client";
import { z } from "zod";
import type { AdminLevel, Pair } from "@aether/shared";

const storedPairsSchema = z.array(z.tuple([z.number().int(), z.number().int()]));

/** Relit la colonne JSON `pairs`. Une donnée corrompue est une erreur serveur, pas une erreur joueur. */
export function parsePairs(json: Prisma.JsonValue): Pair[] {
    const parsed = storedPairsSchema.safeParse(json);
    if (!parsed.success) throw new InternalServerErrorException("Paires de niveau illisibles en base.");
    return parsed.data;
}

export function toAdminLevel(level: Level): AdminLevel {
    return {
        id: level.id,
        order: level.order,
        title: level.title,
        description: level.description,
        hints: level.hints,
        symbols: level.symbols,
        columns: level.columns,
        pairs: parsePairs(level.pairs),
        published: level.published,
        createdAt: level.createdAt.toISOString(),
        updatedAt: level.updatedAt.toISOString(),
    };
}

/** Tri canonique du parcours. */
export const LEVEL_ORDER: Prisma.LevelOrderByWithRelationInput[] = [{ order: "asc" }, { createdAt: "asc" }];
