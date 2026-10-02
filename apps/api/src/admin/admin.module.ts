import { Module } from "@nestjs/common";
import { AdminLevelsController } from "./admin-levels.controller";
import { AdminLevelsService } from "./admin-levels.service";
import { AdminWorldsController } from "./admin-worlds.controller";
import { AdminWorldsService } from "./admin-worlds.service";

@Module({
    controllers: [AdminLevelsController, AdminWorldsController],
    providers: [AdminLevelsService, AdminWorldsService],
})
export class AdminModule {}
