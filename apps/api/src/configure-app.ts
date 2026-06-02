import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { resolvePort } from "./config/port";

const DEFAULT_WEB_PORT = 5173;

export function configureApp(app: INestApplication): void {
  const webPort = resolvePort(process.env.WEB_PORT, DEFAULT_WEB_PORT, "WEB_PORT");

  app.enableCors({
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST"],
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
    .addTag("health")
    .addTag("auth")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, documentFactory, {
    jsonDocumentUrl: "docs-json",
  });
}
