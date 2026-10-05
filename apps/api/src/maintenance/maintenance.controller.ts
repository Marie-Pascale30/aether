import { Controller, HttpCode, Post, Query } from "@nestjs/common";
import { Roles } from "../common/auth.decorators";
import { MaintenanceService, type CleanupReport } from "./maintenance.service";

@Roles("ADMIN")
@Controller("admin/maintenance")
export class MaintenanceController {
    constructor(private readonly maintenance: MaintenanceService) {}

    /** Lance le nettoyage à la demande ; `?dryRun=true` compte sans rien supprimer. */
    @Post("cleanup")
    @HttpCode(200)
    cleanup(@Query("dryRun") dryRun?: string): Promise<CleanupReport> {
        return this.maintenance.cleanup({ dryRun: dryRun === "true" });
    }
}
