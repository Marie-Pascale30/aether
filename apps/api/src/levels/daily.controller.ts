import { Controller, Get } from "@nestjs/common";
import type { DailyState } from "@aether/shared";
import { CurrentUser, type AuthUser } from "../common/auth.decorators";
import { DailyService } from "./daily.service";

@Controller("daily")
export class DailyController {
    constructor(private readonly daily: DailyService) {}

    @Get()
    state(@CurrentUser() user: AuthUser): Promise<DailyState> {
        return this.daily.state(user);
    }
}
