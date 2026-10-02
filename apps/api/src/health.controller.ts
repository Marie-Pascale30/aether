import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "./common/auth.decorators";
import { PrismaService } from "./prisma/prisma.service";

@Controller("health")
export class HealthController {
    constructor(private readonly prisma: PrismaService) {}

    @Public()
    @SkipThrottle()
    @Get()
    async check(): Promise<{ status: "ok" }> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch {
            throw new ServiceUnavailableException("Base de données injoignable.");
        }
        return { status: "ok" };
    }
}
