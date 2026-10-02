import { Module } from "@nestjs/common";
import { AdminLevelsController } from "./admin-levels.controller";
import { AdminLevelsService } from "./admin-levels.service";

@Module({
    controllers: [AdminLevelsController],
    providers: [AdminLevelsService],
})
export class AdminModule {}
