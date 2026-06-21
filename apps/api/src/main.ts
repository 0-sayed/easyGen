import "reflect-metadata";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
import { resolvePort } from "./config/port";

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  configureApp(app);

  const configService = app.get(ConfigService);
  const configuredPort = configService.get<string>("PORT");
  const port = resolvePort(configuredPort, DEFAULT_PORT, "PORT");

  await app.listen(port);
}

void bootstrap();
