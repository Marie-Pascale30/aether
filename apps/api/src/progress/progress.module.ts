import { Module } from "@nestjs/common";
import { LevelsModule } from "../levels/levels.module";
import { ExportService } from "./export.service";
import { MilestonesService } from "./milestones.service";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
    imports: [LevelsModule],
    controllers: [ProgressController],
    providers: [ProgressService, MilestonesService, ExportService],
    exports: [ProgressService, MilestonesService],
})
export class ProgressModule {}
