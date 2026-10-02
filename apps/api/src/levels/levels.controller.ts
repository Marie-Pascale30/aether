import { Controller, Get, Param } from "@nestjs/common";
import type { LevelDetail, WorldDetail, WorldSummary } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { LevelsService } from "./levels.service";

@Controller()
export class LevelsController {
    constructor(private readonly levels: LevelsService) {}

    @Get("worlds")
    worlds(@CurrentUser() user: AuthUser): Promise<WorldSummary[]> {
        return this.levels.worlds(user);
    }

    @Get("worlds/:slug")
    world(@CurrentUser() user: AuthUser, @Param("slug") slug: string): Promise<WorldDetail> {
        return this.levels.world(user, slug);
    }

    @Get("levels/:id")
    detail(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<LevelDetail> {
        return this.levels.detail(user, id);
    }
}
