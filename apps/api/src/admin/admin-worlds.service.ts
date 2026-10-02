import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { World } from "@prisma/client";
import type { AdminWorld, WorldInput } from "@aether/shared";
import { BY_ORDER, toTheme } from "../levels/level.mapper";
import { PrismaService } from "../prisma/prisma.service";

type WorldWithCount = World & { _count: { levels: number } };

function toAdminWorld(world: WorldWithCount): AdminWorld {
    return {
        id: world.id,
        slug: world.slug,
        order: world.order,
        title: world.title,
        tagline: world.tagline,
        description: world.description,
        theme: toTheme(world.theme),
        published: world.published,
        levelCount: world._count.levels,
    };
}

const WITH_COUNT = { _count: { select: { levels: true } } } as const;

@Injectable()
export class AdminWorldsService {
    constructor(private readonly prisma: PrismaService) {}

    async list(): Promise<AdminWorld[]> {
        const worlds = await this.prisma.world.findMany({ orderBy: BY_ORDER, include: WITH_COUNT });
        return worlds.map(toAdminWorld);
    }

    async create(input: WorldInput): Promise<AdminWorld> {
        await this.assertSlugFree(input.slug);
        const { _max } = await this.prisma.world.aggregate({ _max: { order: true } });
        const world = await this.prisma.world.create({ data: { ...input, order: (_max.order ?? -1) + 1 }, include: WITH_COUNT });
        return toAdminWorld(world);
    }

    async update(id: string, input: WorldInput): Promise<AdminWorld> {
        await this.get(id);
        await this.assertSlugFree(input.slug, id);
        const world = await this.prisma.world.update({ where: { id }, data: input, include: WITH_COUNT });
        return toAdminWorld(world);
    }

    /** Refusé tant que le monde contient des énigmes : on ne supprime pas de contenu par ricochet. */
    async remove(id: string): Promise<void> {
        const world = await this.get(id);
        if (world._count.levels > 0) {
            throw new ConflictException("Ce monde contient encore des énigmes : déplace-les ou supprime-les d'abord.");
        }
        await this.prisma.world.delete({ where: { id } });
    }

    async reorder(ids: string[]): Promise<AdminWorld[]> {
        const existing = await this.prisma.world.findMany({ select: { id: true } });
        const known = new Set(existing.map((world) => world.id));
        const unique = new Set(ids);
        if (unique.size !== ids.length || unique.size !== known.size || ids.some((id) => !known.has(id))) {
            throw new BadRequestException("L'ordre doit lister chaque monde exactement une fois.");
        }
        await this.prisma.$transaction(ids.map((id, order) => this.prisma.world.update({ where: { id }, data: { order } })));
        return this.list();
    }

    private async get(id: string): Promise<WorldWithCount> {
        const world = await this.prisma.world.findUnique({ where: { id }, include: WITH_COUNT });
        if (!world) throw new NotFoundException("Monde introuvable.");
        return world;
    }

    private async assertSlugFree(slug: string, exceptId?: string) {
        const other = await this.prisma.world.findUnique({ where: { slug }, select: { id: true } });
        if (other && other.id !== exceptId) throw new ConflictException(`L'identifiant « ${slug} » est déjà pris par un autre monde.`);
    }
}
