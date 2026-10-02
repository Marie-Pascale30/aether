import { Controller, Get } from "@nestjs/common";
import type { PlayerStats, ProgressSummary } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { ProgressService } from "./progress.service";

@Controller("me")
export class ProgressController {
    constructor(private readonly progress: ProgressService) {}

    @Get("progress")
    summary(@CurrentUser() user: AuthUser): Promise<ProgressSummary> {
        return this.progress.summary(user.id);
    }

    @Get("stats")
    stats(@CurrentUser() user: AuthUser): Promise<PlayerStats> {
        return this.progress.stats(user.id);
    }
}
