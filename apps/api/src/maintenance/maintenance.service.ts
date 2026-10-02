import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { ENV, type Env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Jetons e-mail utilisés ou expirés : gardés une semaine pour l'investigation, puis supprimés. */
const TOKEN_RETENTION_DAYS = 7;

export interface CleanupReport {
    dryRun: boolean;
    guests: number;
    openSessions: number;
    tokens: number;
}

/**
 * Nettoyage nocturne : invités inactifs (avec leur progression, qu'aucun compte ne réclamera),
 * parties abandonnées et jetons périmés. Les comptes inscrits ne sont jamais supprimés.
 */
@Injectable()
export class MaintenanceService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly scheduler: SchedulerRegistry,
        @Inject(ENV) private readonly env: Env,
        @InjectPinoLogger(MaintenanceService.name) private readonly logger: PinoLogger,
    ) {}

    onModuleInit() {
        if (this.env.NODE_ENV === "test") return;
        // Programmée ici (et non par décorateur) pour lire le fuseau dans la configuration validée.
        const job = CronJob.from({
            cronTime: "30 3 * * *",
            timeZone: this.env.DAILY_TIMEZONE,
            onTick: () => void this.cleanup().catch((error: unknown) => this.logger.error({ err: error }, "Nettoyage nocturne en échec")),
        });
        this.scheduler.addCronJob("nightly-cleanup", job);
        job.start();
    }

    async cleanup({ dryRun = false }: { dryRun?: boolean } = {}): Promise<CleanupReport> {
        const now = Date.now();
        const guestCutoff = new Date(now - this.env.GUEST_RETENTION_DAYS * DAY_MS);
        const sessionCutoff = new Date(now - this.env.OPEN_SESSION_RETENTION_DAYS * DAY_MS);
        const tokenCutoff = new Date(now - TOKEN_RETENTION_DAYS * DAY_MS);

        const guests = { isGuest: true, lastSeenAt: { lt: guestCutoff } };
        const openSessions = { completedAt: null, startedAt: { lt: sessionCutoff } };
        const tokens = { OR: [{ expiresAt: { lt: tokenCutoff } }, { usedAt: { lt: tokenCutoff } }] };

        const report: CleanupReport = dryRun
            ? {
                  dryRun,
                  guests: await this.prisma.user.count({ where: guests }),
                  openSessions: await this.prisma.playSession.count({ where: openSessions }),
                  tokens: await this.prisma.authToken.count({ where: tokens }),
              }
            : {
                  dryRun,
                  // Les invités emportent leurs parties et résultats (suppression en cascade).
                  guests: (await this.prisma.user.deleteMany({ where: guests })).count,
                  openSessions: (await this.prisma.playSession.deleteMany({ where: openSessions })).count,
                  tokens: (await this.prisma.authToken.deleteMany({ where: tokens })).count,
              };

        this.logger.info({ ...report, guestCutoff, sessionCutoff }, dryRun ? "Nettoyage (simulation)" : "Nettoyage effectué");
        return report;
    }
}
