import { Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { levelResultSchema, type CompletionResult, type LevelResultInput } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { ZodPipe } from "../common/zod.pipe";
import { PlayService } from "./play.service";

@Controller()
export class PlayController {
    constructor(private readonly play: PlayService) {}

    /** Victoire sur une énigme jouée sur l'appareil ; renvoyer le même `resultId` ne compte qu'une fois. */
    @Post("levels/:levelId/results")
    @HttpCode(200)
    result(
        @CurrentUser() user: AuthUser,
        @Param("levelId") levelId: string,
        @Body(new ZodPipe(levelResultSchema)) body: LevelResultInput,
    ): Promise<CompletionResult> {
        return this.play.submitResult(user, levelId, body);
    }
}
