import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ENV, type Env } from "../config/env";
import { AccountTokensService } from "./account-tokens.service";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";

@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ENV],
            useFactory: (env: Env) => ({ secret: env.JWT_SECRET, signOptions: { expiresIn: "30d" } }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, AuthGuard, AccountTokensService],
    exports: [AuthService, AuthGuard],
})
export class AuthModule {}
