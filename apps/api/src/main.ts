import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { resolvePort } from "./config/port";

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("easyGen API")
    .setDescription("Bootstrap API surface for the authentication task.")
    .setVersion("0.1.0")
    .addTag("health")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "docs-json",
  });

  const configuredPort = process.env.PORT;
  const port = resolvePort(configuredPort, DEFAULT_PORT, "PORT");

  await app.listen(port);
}

void bootstrap();
