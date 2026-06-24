import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { JwtModuleOptions } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import { UsersModule } from "../users/users.module";
import { AccountActivityRepository } from "./account-activity.repository";
import { AccountActivityService } from "./account-activity.service";
import { AuthAuditLogger } from "./auth-audit.logger";
import { AuthController } from "./auth.controller";
import { AuthSessionRepository } from "./auth-session.repository";
import { AuthSessionService } from "./auth-session.service";
import { AuthService } from "./auth.service";
import { AuthThrottleService } from "./auth-throttle.service";
import {
  AUTH_TOKEN_DELIVERY,
  InMemoryAuthTokenDelivery,
  LogAuthTokenDelivery,
} from "./auth-token.delivery";
import { EmailVerificationService } from "./email-verification.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordResetService } from "./password-reset.service";
import {
  AccountActivityEvent,
  AccountActivityEventSchema,
} from "./schemas/account-activity-event.schema";
import { AuthSession, AuthSessionSchema } from "./schemas/auth-session.schema";

type JwtExpiresIn = NonNullable<JwtModuleOptions["signOptions"]>["expiresIn"];

const DEFAULT_JWT_EXPIRES_IN: JwtExpiresIn = "15m";

@Module({
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: AccountActivityEvent.name, schema: AccountActivityEventSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>("JWT_SECRET");
        const expiresIn = configService.get<JwtExpiresIn>("JWT_EXPIRES_IN", DEFAULT_JWT_EXPIRES_IN);

        if (secret === undefined || secret.trim() === "") {
          throw new Error("JWT_SECRET is required.");
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [
    AccountActivityRepository,
    AccountActivityService,
    AuthService,
    JwtAuthGuard,
    AuthAuditLogger,
    AuthThrottleService,
    EmailVerificationService,
    PasswordResetService,
    InMemoryAuthTokenDelivery,
    LogAuthTokenDelivery,
    {
      provide: AUTH_TOKEN_DELIVERY,
      useExisting: LogAuthTokenDelivery,
    },
    AuthSessionRepository,
    AuthSessionService,
  ],
})
export class AuthModule {}
