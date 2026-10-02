import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [MaintenanceController],
    providers: [MaintenanceService],
})
export class MaintenanceModule {}
