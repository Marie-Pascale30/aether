import { Controller, Get, Header } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { AccountExport, MilestonesView, PlayerStats, ProgressSummary, SyncState } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { ExportService } from "./export.service";
import { MilestonesService } from "./milestones.service";
import { ProgressService } from "./progress.service";

@Controller("me")
export class ProgressController {
    constructor(
        private readonly progress: ProgressService,
        private readonly milestones: MilestonesService,
        private readonly exporter: ExportService,
    ) {}

    /** Toutes les données du joueur, en JSON téléchargeable (RGPD, droits d'accès et de portabilité). */
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @Get("export")
    @Header("Cache-Control", "no-store")
    @Header("Content-Disposition", 'attachment; filename="aether-mes-donnees.json"')
    export(@CurrentUser() user: AuthUser): Promise<AccountExport> {
        return this.exporter.export(user.id);
    }

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
