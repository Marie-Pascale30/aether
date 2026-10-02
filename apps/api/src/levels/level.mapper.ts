import { InternalServerErrorException } from "@nestjs/common";
import type { Level, Prisma, World } from "@prisma/client";
import { z } from "zod";
import { WORLD_THEMES, type AdminLevel, type Group, type WorldRef, type WorldTheme } from "@aether/shared";

const storedGroupsSchema = z.array(z.array(z.number().int()).min(1));

/** Relit la colonne JSON `groups`. Une donnée corrompue est une erreur serveur, pas une erreur joueur. */
export function parseGroups(json: Prisma.JsonValue): Group[] {
    const parsed = storedGroupsSchema.safeParse(json);
    if (!parsed.success) throw new InternalServerErrorException("Groupes de niveau illisibles en base.");
    return parsed.data;
}

/** Un thème inconnu (saisi à la main en base) retombe sur le thème par défaut. */
export function toTheme(theme: string): WorldTheme {
    return (WORLD_THEMES as readonly string[]).includes(theme) ? (theme as WorldTheme) : "origines";
}

export function toWorldRef(world: Pick<World, "slug" | "title" | "theme">): WorldRef {
    return { slug: world.slug, title: world.title, theme: toTheme(world.theme) };
}

export function toAdminLevel(level: Level): AdminLevel {
    return {
        id: level.id,
        worldId: level.worldId,
        order: level.order,
        title: level.title,
        description: level.description,
        hints: level.hints,
        symbols: level.symbols,
        columns: level.columns,
        kind: level.kind,
        groups: parseGroups(level.groups),
        published: level.published,
        createdAt: level.createdAt.toISOString(),
        updatedAt: level.updatedAt.toISOString(),
    };
}

/** Tri canonique (mondes comme énigmes). */
export const BY_ORDER = [{ order: "asc" as const }, { createdAt: "asc" as const }];
