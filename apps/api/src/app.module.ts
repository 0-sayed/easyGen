import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BuildInfoService } from "./build-info/build-info.service";
import { validateAppConfig } from "./config/app-config";
import { DatabaseModule } from "./database/database.module";
import { createCorrelationId } from "./observability/correlation-id";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      envFilePath: [".env", "../../.env"],
      ignoreEnvFile: process.env.NODE_ENV === "test",
      isGlobal: true,
      validate: validateAppConfig,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          customAttributeKeys: {
            reqId: "correlationId",
          },
          genReqId: createCorrelationId,
          level: configService.get<string>("LOG_LEVEL", "info"),
        },
      }),
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [BuildInfoService],
})
export class AppModule {}
