import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { clientErrorSchema, type ClientErrorInput } from "@aether/shared";
import { CurrentUser, Public, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";

/** Reçoit les erreurs JavaScript du navigateur pour qu'elles apparaissent dans les journaux serveur. */
@Controller("client-errors")
export class ClientErrorsController {
    constructor(@InjectPinoLogger("client") private readonly logger: PinoLogger) {}

    @Public()
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @Post()
    @HttpCode(204)
    report(@Body(new ZodPipe(clientErrorSchema)) body: ClientErrorInput, @CurrentUser() user: AuthUser | undefined): void {
        this.logger.error({ source: "client", userId: user?.id, ...body }, `Erreur navigateur : ${body.message}`);
    }
}
