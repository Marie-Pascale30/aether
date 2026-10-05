import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Level } from "@prisma/client";
import type { ContentBundle, ContentLevel } from "@aether/shared";
import { PrismaService } from "../prisma/prisma.service";
import { DailyService } from "./daily.service";
import { BY_ORDER, parseGroups, parsePuzzle, toTheme, toWorldRef } from "./level.mapper";

/**
 * Le contenu publié, d'un seul tenant : l'appareil le garde pour jouer hors ligne et calcule
 * lui-même le parcours (mêmes règles que le serveur, dans @aether/shared).
 */
@Injectable()
export class ContentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly daily: DailyService,
    ) {}

    async bundle(): Promise<ContentBundle> {
        const [worlds, days] = await Promise.all([
            this.prisma.world.findMany({
                where: { published: true, isDaily: false },
                orderBy: BY_ORDER,
                include: { levels: { where: { published: true }, orderBy: BY_ORDER } },
            }),
            this.daily.upcoming(),
        ]);

        const content: Omit<ContentBundle, "version"> = {
            worlds: worlds.map((world) => ({
                id: world.id,
                slug: world.slug,
                title: world.title,
                tagline: world.tagline,
                description: world.description,
                theme: toTheme(world.theme),
                levels: world.levels.map(toContentLevel),
            })),
            daily: {
                timeZone: this.daily.timeZone,
                days: days.map(({ date, level }) => ({ date, world: toWorldRef(level.world), level: toContentLevel(level) })),
            },
        };
        // La version suit le contenu lui-même : l'appareil sait sans ambiguïté s'il est à jour.
        const version = createHash("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 16);
        return { version, ...content };
    }
}

export function toContentLevel(level: Level): ContentLevel {
    return {
        id: level.id,
        title: level.title,
        description: level.description,
        mechanic: level.mechanic,
        kind: level.kind,
        symbols: level.symbols,
        columns: level.columns,
        groups: parseGroups(level.groups),
        puzzle: parsePuzzle(level),
        hints: level.hints,
    };
}
