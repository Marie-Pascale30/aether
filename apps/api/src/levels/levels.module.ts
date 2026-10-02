import { Module } from "@nestjs/common";
import { DailyController } from "./daily.controller";
import { DailyService } from "./daily.service";
import { JourneyService } from "./journey.service";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

@Module({
    controllers: [LevelsController, DailyController],
    providers: [LevelsService, JourneyService, DailyService],
    exports: [LevelsService, JourneyService, DailyService],
})
export class LevelsModule {}
