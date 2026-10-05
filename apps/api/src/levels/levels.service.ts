import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Level, World } from "@prisma/client";
import { toLevelDetail, type LevelDetail, type LevelSummary, type WorldDetail, type WorldSummary } from "@aether/shared";
import type { AuthUser } from "../common/auth.decorators";
import { PrismaService } from "../prisma/prisma.service";
import { DailyService } from "./daily.service";
import { JourneyService, type Journey, type LevelLocation } from "./journey.service";
import { toContentLevel } from "./content.service";
import { goalCount, toWorldRef } from "./level.mapper";

export interface Playable {
    level: Level;
    world: World;
    journey: Journey;
    /** `null` hors parcours : énigme du jour, ou brouillon vu par un administrateur. */
    location: LevelLocation | null;
    /** Jour dont c'est l'énigme du jour, sinon `null`. */
    dailyDate: string | null;
}

@Injectable()
export class LevelsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly journeys: JourneyService,
        private readonly daily: DailyService,
    ) {}

    async worlds(user: AuthUser): Promise<WorldSummary[]> {
        const journey = await this.journeys.load(user.id);
        return journey.worlds.map((_, i) => this.journeys.worldSummary(journey, i));
    }

    async world(user: AuthUser, slug: string): Promise<WorldDetail> {
        const journey = await this.journeys.load(user.id);
        const index = journey.worlds.findIndex((w) => w.world.slug === slug);
        if (index === -1) throw new NotFoundException("Ce monde n'existe pas.");

        const { world, levels } = journey.worlds[index]!;
        return {
            ...this.journeys.worldSummary(journey, index),
            description: world.description,
            levels: levels.map((level, i) => this.levelSummary(journey, level, i)),
            nextLevelId: this.journeys.nextAvailableLevel(journey, index)?.id ?? null,
        };
    }

    /**
     * Énigme jouable par cet utilisateur. Refuse les énigmes scellées ou non publiées, sauf pour
     * un administrateur (aperçu depuis l'éditeur). Une énigme du jour l'est le jour venu : avec
     * `playedAt` (résultat envoyé, peut-être en retard), le jour de la victoire.
     */
    async playable(user: AuthUser, levelId: string, playedAt?: Date): Promise<Playable> {
        const journey = await this.journeys.load(user.id);
        const location = this.journeys.locate(journey, levelId);
        const isAdmin = user.role === "ADMIN";

        if (!location) {
            const dailyDate = await this.daily.dateForLevel(levelId, playedAt);
            const offJourney = isAdmin || dailyDate ? await this.prisma.level.findUnique({ where: { id: levelId }, include: { world: true } }) : null;
            if (!offJourney) throw new NotFoundException("Cette énigme n'existe pas, ou n'est pas encore ouverte.");
            const { world, ...level } = offJourney;
            return { level, world, journey, location: null, dailyDate };
        }

        if (!isAdmin && journey.levelStatuses.get(levelId) === "locked") {
            throw new ForbiddenException("Cette énigme est encore scellée : résous d'abord celles qui la précèdent.");
        }
        const { world, levels } = journey.worlds[location.worldIndex]!;
        return { level: levels[location.levelIndex]!, world, journey, location, dailyDate: null };
    }

    /** Énigme prête à jouer (hors contenu embarqué : brouillon d'administrateur, énigme du jour). */
    async detail(user: AuthUser, levelId: string): Promise<LevelDetail> {
        const { level, world, journey, location, dailyDate } = await this.playable(user, levelId);
        const siblings = location ? journey.worlds[location.worldIndex]!.levels.map(toContentLevel) : [];
        return toLevelDetail(toContentLevel(level), toWorldRef(world), location ? { siblings, index: location.levelIndex } : null, dailyDate !== null);
    }

    private levelSummary(journey: Journey, level: Level, index: number): LevelSummary {
        const best = journey.progress.get(level.id);
        return {
            id: level.id,
            position: index + 1,
            title: level.title,
            mechanic: level.mechanic,
            kind: level.kind,
            groupCount: goalCount(level),
            status: journey.levelStatuses.get(level.id) ?? "locked",
            petals: best?.petals ?? 0,
            bestTimeMs: best?.bestTimeMs ?? null,
        };
    }
}
