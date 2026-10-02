import { Module } from "@nestjs/common";
import { LevelsModule } from "../levels/levels.module";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
    imports: [LevelsModule],
    controllers: [ProgressController],
    providers: [ProgressService],
    exports: [ProgressService],
})
export class ProgressModule {}
