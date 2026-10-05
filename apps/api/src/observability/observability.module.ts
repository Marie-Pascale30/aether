import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ClientErrorsController } from "./client-errors.controller";
import { ErrorFilter } from "./error.filter";
import { LoggingModule } from "./logging.module";

@Module({
    imports: [LoggingModule],
    controllers: [ClientErrorsController],
    providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
})
export class ObservabilityModule {}
