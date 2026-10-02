import { Controller, Get, Query } from "@nestjs/common";
import { leaderboardQuerySchema, type Leaderboard, type LeaderboardQuery } from "@aether/shared";
import { CurrentUser, Public, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
export class LeaderboardController {
    constructor(private readonly leaderboard: LeaderboardService) {}

    @Public()
    @Get()
    get(
        @Query(new ZodPipe(leaderboardQuerySchema)) query: LeaderboardQuery,
        @CurrentUser() user: AuthUser | undefined,
    ): Promise<Leaderboard> {
        return this.leaderboard.get(query.limit, user?.id);
    }
}
