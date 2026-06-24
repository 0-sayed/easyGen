import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { resolvePort } from "./config/port";

const DEFAULT_WEB_PORT = 5173;

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const webPort = resolvePort(configService.get<string>("WEB_PORT"), DEFAULT_WEB_PORT, "WEB_PORT");

  app.enableCors({
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "PATCH", "POST"],
    origin: [`http://127.0.0.1:${String(webPort)}`, `http://localhost:${String(webPort)}`],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("easyGen API")
    .setDescription("API surface for the authentication task.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addTag("health", "Public liveness endpoint.")
    .addTag("ready", "Public backing-service readiness endpoint.")
    .addTag("status", "Public build and environment metadata endpoint.")
    .addTag("auth", "Authentication and current-user endpoints.")
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig, { autoTagControllers: false });
  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "docs-json",
  });
}
