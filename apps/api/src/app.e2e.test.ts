import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import apiPackage from "../package.json";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

const expectedApiVersion =
  typeof apiPackage.version === "string" && apiPackage.version.trim().length > 0
    ? apiPackage.version
    : "0.0.0";

describe("App", () => {
  let app: INestApplication | undefined;
  let container: StartedMongoDBContainer | undefined;
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousMongoDbUri = process.env.MONGODB_URI;
  const previousLogLevel = process.env.LOG_LEVEL;
  const previousWebPort = process.env.WEB_PORT;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    process.env.JWT_SECRET = "test-secret";
    process.env.MONGODB_URI = `mongodb://${host}:${mappedPort}/easygen_test?directConnection=true`;
    process.env.LOG_LEVEL = "silent";
    process.env.WEB_PORT = "5173";
    process.env.NODE_ENV = "test";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();

    restoreTestEnv(
      previousJwtSecret,
      previousMongoDbUri,
      previousLogLevel,
      previousWebPort,
      previousNodeEnv
    );
  });

  it("serves the health endpoint from a booted Nest app", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer()).get("/health").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });

  it("serves public build information without authentication", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer()).get("/status").expect(200);

    expect(response.body).toEqual({
      service: "easygen-api",
      version: expectedApiVersion,
      environment: "test",
    });
  });

  it("allows frontend auth preflight requests from the configured web origin", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer())
      .options("/auth/signup")
      .set("Origin", "http://127.0.0.1:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization, content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
  });

  it("allows frontend auth preflight requests from localhost", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer())
      .options("/auth/signin")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization, content-type")
      .expect(204);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(response.headers["access-control-allow-headers"]).toContain("Content-Type");
  });
});

function restoreTestEnv(
  jwtSecret: string | undefined,
  mongodbUri: string | undefined,
  logLevel: string | undefined,
  webPort: string | undefined,
  nodeEnv: string | undefined
): void {
  if (jwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = jwtSecret;
  }

  if (mongodbUri === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = mongodbUri;
  }

  if (logLevel === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = logLevel;
  }

  if (webPort === undefined) {
    delete process.env.WEB_PORT;
  } else {
    process.env.WEB_PORT = webPort;
  }

  if (nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = nodeEnv;
  }
}
