import { Module } from "@nestjs/common";
import { AdminLevelStatsService } from "./admin-level-stats.service";
import { AdminLevelsController } from "./admin-levels.controller";
import { AdminLevelsService } from "./admin-levels.service";
import { AdminWorldsController } from "./admin-worlds.controller";
import { AdminWorldsService } from "./admin-worlds.service";

@Module({
    controllers: [AdminLevelsController, AdminWorldsController],
    providers: [AdminLevelsService, AdminLevelStatsService, AdminWorldsService],
})
export class AdminModule {}
