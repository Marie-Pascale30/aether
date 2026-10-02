import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminLevel, LevelInput } from "@aether/shared";
import { LEVEL_ORDER, toAdminLevel } from "../levels/level.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminLevelsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(): Promise<AdminLevel[]> {
        const levels = await this.prisma.level.findMany({ orderBy: LEVEL_ORDER });
        return levels.map(toAdminLevel);
    }

    async get(id: string): Promise<AdminLevel> {
        const level = await this.prisma.level.findUnique({ where: { id } });
        if (!level) throw new NotFoundException("Niveau introuvable.");
        return toAdminLevel(level);
    }

    /** Ajoute le niveau en fin de parcours. */
    async create(input: LevelInput): Promise<AdminLevel> {
        const { _max } = await this.prisma.level.aggregate({ _max: { order: true } });
        const level = await this.prisma.level.create({ data: { ...input, order: (_max.order ?? -1) + 1 } });
        return toAdminLevel(level);
    }

    /**
     * Les parties en cours sur ce niveau sont abandonnées : leurs paires trouvées
     * désignent peut-être des cases qui n'ont plus le même sens.
     */
    async update(id: string, input: LevelInput): Promise<AdminLevel> {
        await this.get(id);
        const [level] = await this.prisma.$transaction([
            this.prisma.level.update({ where: { id }, data: input }),
            this.prisma.playSession.deleteMany({ where: { levelId: id, completedAt: null } }),
        ]);
        return toAdminLevel(level);
    }

    async remove(id: string): Promise<void> {
        await this.get(id);
        await this.prisma.level.delete({ where: { id } });
    }

    /** `ids` doit contenir exactement tous les niveaux, dans le nouvel ordre. */
    async reorder(ids: string[]): Promise<AdminLevel[]> {
        const existing = await this.prisma.level.findMany({ select: { id: true } });
        const known = new Set(existing.map((level) => level.id));
        const unique = new Set(ids);

        if (unique.size !== ids.length || unique.size !== known.size || ids.some((id) => !known.has(id))) {
            throw new BadRequestException("L'ordre doit lister chaque niveau exactement une fois.");
        }

        await this.prisma.$transaction(ids.map((id, order) => this.prisma.level.update({ where: { id }, data: { order } })));
        return this.list();
    }
}
