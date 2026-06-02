import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "./app.module";

describe("App", () => {
  let app: INestApplication | undefined;
  let container: StartedMongoDBContainer | undefined;
  const previousMongoDbUri = process.env.MONGODB_URI;
  const previousLogLevel = process.env.LOG_LEVEL;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    process.env.MONGODB_URI = `mongodb://${host}:${mappedPort}/easygen_test?directConnection=true`;
    process.env.LOG_LEVEL = "silent";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();

    restoreTestEnv(previousMongoDbUri, previousLogLevel);
  });

  it("serves the health endpoint from a booted Nest app", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer()).get("/health").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });
});

function restoreTestEnv(mongodbUri: string | undefined, logLevel: string | undefined): void {
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
}
