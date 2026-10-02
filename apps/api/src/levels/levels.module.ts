import { Module } from "@nestjs/common";
import { JourneyService } from "./journey.service";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

@Module({
    controllers: [LevelsController],
    providers: [LevelsService, JourneyService],
    exports: [LevelsService, JourneyService],
})
export class LevelsModule {}
