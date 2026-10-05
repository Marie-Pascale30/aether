import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import {
    levelInputSchema,
    reorderLevelsSchema,
    type AdminLevel,
    type LevelDesignStats,
    type LevelInput,
    type ReorderLevelsInput,
} from "@aether/shared";
import { Roles } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { AdminLevelStatsService } from "./admin-level-stats.service";
import { AdminLevelsService } from "./admin-levels.service";

@Roles("ADMIN")
@Controller("admin/levels")
export class AdminLevelsController {
    constructor(
        private readonly levels: AdminLevelsService,
        private readonly stats: AdminLevelStatsService,
    ) {}

    @Get()
    list(): Promise<AdminLevel[]> {
        return this.levels.list();
    }

    @Get(":id")
    get(@Param("id") id: string): Promise<AdminLevel> {
        return this.levels.get(id);
    }

    @Get(":id/stats")
    levelStats(@Param("id") id: string): Promise<LevelDesignStats> {
        return this.stats.forLevel(id);
    }

    @Post()
    create(@Body(new ZodPipe(levelInputSchema)) body: LevelInput): Promise<AdminLevel> {
        return this.levels.create(body);
    }

    @Post("reorder")
    @HttpCode(200)
    reorder(@Body(new ZodPipe(reorderLevelsSchema)) body: ReorderLevelsInput): Promise<AdminLevel[]> {
        return this.levels.reorder(body.worldId, body.ids);
    }

    @Post(":id/duplicate")
    duplicate(@Param("id") id: string): Promise<AdminLevel> {
        return this.levels.duplicate(id);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body(new ZodPipe(levelInputSchema)) body: LevelInput): Promise<AdminLevel> {
        return this.levels.update(id, body);
    }

    @Delete(":id")
    @HttpCode(204)
    remove(@Param("id") id: string): Promise<void> {
        return this.levels.remove(id);
    }
}
