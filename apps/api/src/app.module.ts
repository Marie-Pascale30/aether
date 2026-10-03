import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AuthGuard } from "./auth/auth.guard";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "./config/config.module";
import { HealthController } from "./health.controller";
import { LevelsModule } from "./levels/levels.module";
import { MailModule } from "./mail/mail.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { ObservabilityModule } from "./observability/observability.module";
import { PlayModule } from "./play/play.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProgressModule } from "./progress/progress.module";

@Module({
    imports: [
        ConfigModule,
        ObservabilityModule,
        PrismaModule,
        MailModule,
        ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 240 }]),
        AuthModule,
        LevelsModule,
        PlayModule,
        ProgressModule,
        AdminModule,
        MaintenanceModule,
    ],
    controllers: [HealthController],
    providers: [
        // Ordre significatif : limitation de débit, puis authentification.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useExisting: AuthGuard },
    ],
})
export class AppModule {}
