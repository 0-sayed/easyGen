import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import request from "supertest";
import type { Response } from "supertest";
import type { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AppModule } from "../app.module";
import { configureApp } from "../configure-app";

describe("Auth API", () => {
  let app: INestApplication | undefined;
  let container: StartedMongoDBContainer | undefined;
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousLogLevel = process.env.LOG_LEVEL;
  const previousMongoDbUri = process.env.MONGODB_URI;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    process.env.JWT_SECRET = "test-secret";
    process.env.LOG_LEVEL = "silent";
    process.env.MONGODB_URI = `mongodb://${host}:${mappedPort}/easygen_test?directConnection=true`;

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
    restoreJwtSecret(previousJwtSecret);
    restoreLogLevel(previousLogLevel);
    restoreMongoDbUri(previousMongoDbUri);
  });

  it("signs up, signs in, and returns the protected current user", async () => {
    const server = getServer(app);

    const signupResponse = await request(server)
      .post("/auth/signup")
      .send({ email: "person@example.com", name: "Person Name", password: "Password1!" })
      .expect(201);

    expect(signupResponse.body).toEqual({
      accessToken: expect.any(String),
      user: {
        email: "person@example.com",
        id: expect.any(String),
        name: "Person Name",
      },
    });
    expect(signupResponse.body.user).not.toHaveProperty("passwordHash");

    const signinResponse = await request(server)
      .post("/auth/signin")
      .send({ email: "person@example.com", password: "Password1!" })
      .expect(200);
    const accessToken = getAccessToken(signinResponse);

    const meResponse = await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body).toEqual({
      user: signinResponse.body.user,
    });
  });

  it("rejects invalid signup input", async () => {
    await request(getServer(app))
      .post("/auth/signup")
      .send({ email: "not-email", name: "Al", password: "weak" })
      .expect(400);
  });

  it("rejects duplicate signup email", async () => {
    const server = getServer(app);
    const payload = {
      email: "duplicate@example.com",
      name: "Duplicate User",
      password: "Password1!",
    };

    await request(server).post("/auth/signup").send(payload).expect(201);
    await request(server).post("/auth/signup").send(payload).expect(409);
  });

  it("rejects invalid credentials and missing bearer tokens", async () => {
    const server = getServer(app);

    await request(server)
      .post("/auth/signin")
      .send({ email: "missing@example.com", password: "Password1!" })
      .expect(401);

    await request(server).get("/auth/me").expect(401);
  });

  it("rejects malformed bearer tokens", async () => {
    const server = getServer(app);

    const signinResponse = await request(server)
      .post("/auth/signup")
      .send({ email: "malformed@example.com", name: "Malformed User", password: "Password1!" })
      .expect(201);
    const accessToken = getAccessToken(signinResponse);

    await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken} extra`)
      .expect(401);
  });
});

function getServer(app: INestApplication | undefined): App {
  if (app === undefined) {
    throw new Error("Nest app was not initialized.");
  }

  return app.getHttpServer();
}

function getAccessToken(response: Response): string {
  const body: unknown = response.body;

  if (
    typeof body !== "object" ||
    body === null ||
    !("accessToken" in body) ||
    typeof body.accessToken !== "string"
  ) {
    throw new Error("Expected response body to include an access token.");
  }

  return body.accessToken;
}

function restoreJwtSecret(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = value;
  }
}

function restoreLogLevel(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.LOG_LEVEL;
  } else {
    process.env.LOG_LEVEL = value;
  }
}

function restoreMongoDbUri(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = value;
  }
}
