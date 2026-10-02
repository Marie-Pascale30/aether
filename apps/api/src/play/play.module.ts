import { Module } from "@nestjs/common";
import { LevelsModule } from "../levels/levels.module";
import { ProgressModule } from "../progress/progress.module";
import { PlayController } from "./play.controller";
import { PlayService } from "./play.service";

@Module({
    imports: [LevelsModule, ProgressModule],
    controllers: [PlayController],
    providers: [PlayService],
})
export class PlayModule {}
