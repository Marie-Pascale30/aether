import { Module } from "@nestjs/common";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";
import { DailyController } from "./daily.controller";
import { DailyService } from "./daily.service";
import { JourneyService } from "./journey.service";
import { LevelsController } from "./levels.controller";
import { LevelsService } from "./levels.service";

@Module({
    controllers: [LevelsController, DailyController, ContentController],
    providers: [LevelsService, JourneyService, DailyService, ContentService],
    exports: [LevelsService, JourneyService, DailyService],
})
export class LevelsModule {}
