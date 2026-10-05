import { Controller, Get } from "@nestjs/common";
import type { MilestonesView, PlayerStats, ProgressSummary, SyncState } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { MilestonesService } from "./milestones.service";
import { ProgressService } from "./progress.service";

@Controller("me")
export class ProgressController {
    constructor(
        private readonly progress: ProgressService,
        private readonly milestones: MilestonesService,
    ) {}

    @Get("progress")
    summary(@CurrentUser() user: AuthUser): Promise<ProgressSummary> {
        return this.progress.summary(user.id);
    }

    @Get("sync")
    sync(@CurrentUser() user: AuthUser): Promise<SyncState> {
        return this.progress.sync(user.id);
    }

    @Get("milestones")
    milestonesView(@CurrentUser() user: AuthUser): Promise<MilestonesView> {
        return this.milestones.view(user.id);
    }

    @Get("stats")
    stats(@CurrentUser() user: AuthUser): Promise<PlayerStats> {
        return this.progress.stats(user.id);
    }
}
