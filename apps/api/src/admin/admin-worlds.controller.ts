import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { reorderWorldsSchema, worldInputSchema, type AdminWorld, type ReorderWorldsInput, type WorldInput } from "@aether/shared";
import { Roles } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { AdminWorldsService } from "./admin-worlds.service";

@Roles("ADMIN")
@Controller("admin/worlds")
export class AdminWorldsController {
    constructor(private readonly worlds: AdminWorldsService) {}

    @Get()
    list(): Promise<AdminWorld[]> {
        return this.worlds.list();
    }

    @Post()
    create(@Body(new ZodPipe(worldInputSchema)) body: WorldInput): Promise<AdminWorld> {
        return this.worlds.create(body);
    }

    @Post("reorder")
    @HttpCode(200)
    reorder(@Body(new ZodPipe(reorderWorldsSchema)) body: ReorderWorldsInput): Promise<AdminWorld[]> {
        return this.worlds.reorder(body.ids);
    }

    @Put(":id")
    update(@Param("id") id: string, @Body(new ZodPipe(worldInputSchema)) body: WorldInput): Promise<AdminWorld> {
        return this.worlds.update(id, body);
    }

    @Delete(":id")
    @HttpCode(204)
    remove(@Param("id") id: string): Promise<void> {
        return this.worlds.remove(id);
    }
}
