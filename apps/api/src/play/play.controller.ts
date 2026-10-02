import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import {
    attemptSchema,
    startSessionSchema,
    type AttemptInput,
    type AttemptResult,
    type HintResult,
    type SessionState,
    type StartSessionInput,
} from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { PlayService } from "./play.service";

@Controller()
export class PlayController {
    constructor(private readonly play: PlayService) {}

    @Post("levels/:levelId/sessions")
    start(
        @CurrentUser() user: AuthUser,
        @Param("levelId") levelId: string,
        @Body(new ZodPipe(startSessionSchema)) body: StartSessionInput,
    ): Promise<SessionState> {
        return this.play.start(user, levelId, body.restart);
    }

    @Post("sessions/:sessionId/attempts")
    @HttpCode(200)
    attempt(
        @CurrentUser() user: AuthUser,
        @Param("sessionId") sessionId: string,
        @Body(new ZodPipe(attemptSchema)) body: AttemptInput,
    ): Promise<AttemptResult> {
        return this.play.attempt(user, sessionId, body);
    }

    @Post("sessions/:sessionId/hints")
    @HttpCode(200)
    hint(@CurrentUser() user: AuthUser, @Param("sessionId") sessionId: string): Promise<HintResult> {
        return this.play.hint(user, sessionId);
    }
}
