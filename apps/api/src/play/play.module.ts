import { Module } from "@nestjs/common";
import { LevelsModule } from "../levels/levels.module";
import { PlayController } from "./play.controller";
import { PlayService } from "./play.service";

@Module({
    imports: [LevelsModule],
    controllers: [PlayController],
    providers: [PlayService],
})
export class PlayModule {}
