import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function configureApp(app: INestApplication): void {
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
