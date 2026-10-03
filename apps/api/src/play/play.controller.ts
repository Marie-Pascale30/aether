import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import {
    attemptSchema,
    levelResultSchema,
    startSessionSchema,
    type AttemptInput,
    type AttemptResult,
    type CompletionResult,
    type HintResult,
    type LevelResultInput,
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

    /** Fin d'une énigme jouée sur l'appareil (toutes les mécaniques sauf les Liens). */
    @Post("levels/:levelId/results")
    @HttpCode(200)
    result(
        @CurrentUser() user: AuthUser,
        @Param("levelId") levelId: string,
        @Body(new ZodPipe(levelResultSchema)) body: LevelResultInput,
    ): Promise<CompletionResult> {
        return this.play.submitResult(user, levelId, body);
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
