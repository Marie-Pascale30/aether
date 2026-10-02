import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import {
    levelInputSchema,
    reorderLevelsSchema,
    type AdminLevel,
    type LevelInput,
    type ReorderLevelsInput,
} from "@aether/shared";
import { Roles } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { AdminLevelsService } from "./admin-levels.service";

@Roles("ADMIN")
@Controller("admin/levels")
export class AdminLevelsController {
    constructor(private readonly levels: AdminLevelsService) {}

    @Get()
    list(): Promise<AdminLevel[]> {
        return this.levels.list();
    }

    @Get(":id")
    get(@Param("id") id: string): Promise<AdminLevel> {
        return this.levels.get(id);
    }

    @Post()
    create(@Body(new ZodPipe(levelInputSchema)) body: LevelInput): Promise<AdminLevel> {
        return this.levels.create(body);
    }

    @Post("reorder")
    @HttpCode(200)
    reorder(@Body(new ZodPipe(reorderLevelsSchema)) body: ReorderLevelsInput): Promise<AdminLevel[]> {
        return this.levels.reorder(body.ids);
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
