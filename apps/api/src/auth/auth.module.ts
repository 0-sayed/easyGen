import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { JwtModuleOptions } from "@nestjs/jwt";

import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

type JwtExpiresIn = NonNullable<JwtModuleOptions["signOptions"]>["expiresIn"];

const DEFAULT_JWT_EXPIRES_IN: JwtExpiresIn = "15m";

@Module({
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
  imports: [
    UsersModule,
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
  providers: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
