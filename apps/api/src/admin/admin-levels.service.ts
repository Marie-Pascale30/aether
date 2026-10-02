import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { AdminLevel, LevelInput } from "@aether/shared";
import { BY_ORDER, toAdminLevel } from "../levels/level.mapper";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminLevelsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Toutes les énigmes, groupées par monde (ordre des mondes, puis ordre dans le monde). */
    async list(): Promise<AdminLevel[]> {
        const worlds = await this.prisma.world.findMany({ orderBy: BY_ORDER, include: { levels: { orderBy: BY_ORDER } } });
        return worlds.flatMap((world) => world.levels.map(toAdminLevel));
    }

    async get(id: string): Promise<AdminLevel> {
        const level = await this.prisma.level.findUnique({ where: { id } });
        if (!level) throw new NotFoundException("Niveau introuvable.");
        return toAdminLevel(level);
    }

    /** Ajoute l'énigme à la fin de son monde. */
    async create(input: LevelInput): Promise<AdminLevel> {
        await this.assertWorld(input.worldId);
        const { _max } = await this.prisma.level.aggregate({ where: { worldId: input.worldId }, _max: { order: true } });
        const level = await this.prisma.level.create({ data: { ...input, order: (_max.order ?? -1) + 1 } });
        return toAdminLevel(level);
    }

    /**
     * Les parties en cours sur ce niveau sont abandonnées : leurs groupes trouvés
     * désignent peut-être des cases qui n'ont plus le même sens.
     * Changer de monde place l'énigme à la fin du nouveau monde.
     */
    async update(id: string, input: LevelInput): Promise<AdminLevel> {
        const current = await this.get(id);
        await this.assertWorld(input.worldId);

        let order = current.order;
        if (input.worldId !== current.worldId) {
            const { _max } = await this.prisma.level.aggregate({ where: { worldId: input.worldId }, _max: { order: true } });
            order = (_max.order ?? -1) + 1;
        }

        const [level] = await this.prisma.$transaction([
            this.prisma.level.update({ where: { id }, data: { ...input, order } }),
            this.prisma.playSession.deleteMany({ where: { levelId: id, completedAt: null } }),
        ]);
        return toAdminLevel(level);
    }

    /** Copie en brouillon, placée juste après l'original. */
    async duplicate(id: string): Promise<AdminLevel> {
        const source = await this.prisma.level.findUnique({ where: { id } });
        if (!source) throw new NotFoundException("Niveau introuvable.");

        const level = await this.prisma.$transaction(async (tx) => {
            await tx.level.updateMany({ where: { worldId: source.worldId, order: { gt: source.order } }, data: { order: { increment: 1 } } });
            return tx.level.create({
                data: {
                    worldId: source.worldId,
                    order: source.order + 1,
                    title: `${source.title} (copie)`.slice(0, 80),
                    description: source.description,
                    hints: source.hints,
                    symbols: source.symbols,
                    columns: source.columns,
                    kind: source.kind,
                    groups: source.groups ?? [],
                    published: false,
                },
            });
        });
        return toAdminLevel(level);
    }

    async remove(id: string): Promise<void> {
        await this.get(id);
        await this.prisma.level.delete({ where: { id } });
    }

    /** `ids` doit contenir exactement toutes les énigmes du monde, dans le nouvel ordre. */
    async reorder(worldId: string, ids: string[]): Promise<AdminLevel[]> {
        const existing = await this.prisma.level.findMany({ where: { worldId }, select: { id: true } });
        const known = new Set(existing.map((level) => level.id));
        const unique = new Set(ids);

        if (unique.size !== ids.length || unique.size !== known.size || ids.some((id) => !known.has(id))) {
            throw new BadRequestException("L'ordre doit lister chaque énigme du monde exactement une fois.");
        }

        await this.prisma.$transaction(ids.map((id, order) => this.prisma.level.update({ where: { id }, data: { order } })));
        return this.list();
    }

    private async assertWorld(worldId: string) {
        if (!(await this.prisma.world.findUnique({ where: { id: worldId }, select: { id: true } }))) {
            throw new BadRequestException("Ce monde n'existe pas.");
        }
    }
}
