import { Controller, Get, Param } from "@nestjs/common";
import type { LevelDetail, LevelSummary } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { LevelsService } from "./levels.service";

@Controller("levels")
export class LevelsController {
    constructor(private readonly levels: LevelsService) {}

    @Get()
    list(@CurrentUser() user: AuthUser): Promise<LevelSummary[]> {
        return this.levels.list(user);
    }

    @Get(":id")
    detail(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<LevelDetail> {
        return this.levels.detail(user, id);
    }
}
