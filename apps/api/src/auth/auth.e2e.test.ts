import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Response } from "supertest";
import type { App } from "supertest/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { configureApp } from "../configure-app";
import { AuthThrottleService } from "./auth-throttle.service";
import {
  EMAIL_VERIFICATION_DELIVERY,
  InMemoryEmailVerificationDelivery,
} from "./email-verification.delivery";

interface OpenApiOperation {
  responses?: Record<string, OpenApiResponseObject>;
}

interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
}

interface OpenApiResponseObject {
  content?: Record<string, OpenApiMediaTypeObject>;
}

interface OpenApiMediaTypeObject {
  schema?: OpenApiSchemaObject | OpenApiReferenceObject;
}

interface OpenApiReferenceObject {
  $ref: string;
}

interface OpenApiSchemaObject {
  type?: string;
  allOf?: OpenApiReferenceObject[];
  properties?: Record<string, OpenApiSchemaObject | OpenApiReferenceObject>;
}

interface OpenApiDocument {
  paths?: Record<string, OpenApiPathItem>;
  components?: { schemas?: Record<string, OpenApiSchemaObject> };
}

describe("Auth API", () => {
  let app: INestApplication | undefined;
  let container: StartedMongoDBContainer | undefined;
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousLogLevel = process.env.LOG_LEVEL;
  const previousMongoDbUri = process.env.MONGODB_URI;
  const previousAuthThrottleLimit = process.env.AUTH_THROTTLE_LIMIT;
  const previousAuthThrottleWindowMs = process.env.AUTH_THROTTLE_WINDOW_MS;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    process.env.JWT_SECRET = testToken("jwt-secret");
    process.env.LOG_LEVEL = "silent";
    process.env.MONGODB_URI = `mongodb://${host}:${mappedPort}/easygen_test?directConnection=true`;
    process.env.AUTH_THROTTLE_LIMIT = "2";
    process.env.AUTH_THROTTLE_WINDOW_MS = "60000";
    process.env.NODE_ENV = "test";
    await waitForMongo(process.env.MONGODB_URI);
    const { AppModule } = await import("../app.module");

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EMAIL_VERIFICATION_DELIVERY)
      .useClass(InMemoryEmailVerificationDelivery)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(() => {
    readThrottleAttempts(getThrottleService(app)).clear();
  });

  afterAll(async () => {
    let closeError: unknown;

    try {
      await app?.close();
    } catch (error) {
      closeError = error;
    }

    try {
      await container?.stop();
    } catch (error) {
      closeError ??= error;
    } finally {
      restoreEnv("JWT_SECRET", previousJwtSecret);
      restoreEnv("LOG_LEVEL", previousLogLevel);
      restoreEnv("MONGODB_URI", previousMongoDbUri);
      restoreEnv("AUTH_THROTTLE_LIMIT", previousAuthThrottleLimit);
      restoreEnv("AUTH_THROTTLE_WINDOW_MS", previousAuthThrottleWindowMs);
      restoreEnv("NODE_ENV", previousNodeEnv);
    }

    if (closeError !== undefined) {
      throw closeError instanceof Error
        ? closeError
        : new Error("Failed to close auth e2e resources.");
    }
  });

  it("signs up, signs in, and returns the protected current user", async () => {
    const server = getServer(app);
    const payload = testAccount("person");

    const signupResponse = await request(server).post("/auth/signup").send(payload).expect(201);

    expect(signupResponse.body).toEqual({
      accessToken: expect.any(String),
      user: {
        email: payload.email,
        emailVerified: false,
        id: expect.any(String),
        name: payload.name,
      },
    });
    expect(signupResponse.body.user).not.toHaveProperty("passwordHash");

    const signinResponse = await request(server)
      .post("/auth/signin")
      .send({ email: payload.email, password: payload.password })
      .expect(200);
    const accessToken = getAccessToken(signinResponse);

    const meResponse = await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body).toEqual({
      user: signinResponse.body.user,
    });

    const lowercaseBearerResponse = await request(server)
      .get("/auth/me")
      .set("Authorization", `bearer   ${accessToken}`)
      .expect(200);

    expect(lowercaseBearerResponse.body).toEqual({
      user: signinResponse.body.user,
    });
  });

  it("documents auth response contracts in OpenAPI output", async () => {
    const response = await request(getServer(app)).get("/docs-json").expect(200);
    const document = response.body;

    const signupOperation = expectPostOperation(document, "/auth/signup");
    const signinOperation = expectPostOperation(document, "/auth/signin");
    const emailVerificationRequestOperation = expectPostOperation(
      document,
      "/auth/email-verification/request"
    );
    const emailVerificationConfirmOperation = expectPostOperation(
      document,
      "/auth/email-verification/confirm"
    );
    const meOperation = expectGetOperation(document, "/auth/me");

    expectJsonSchemaReference(signupOperation, "201", "AuthResponse");
    expectJsonSchemaReference(signinOperation, "200", "AuthResponse");
    expectJsonSchemaReference(
      emailVerificationRequestOperation,
      "202",
      "EmailVerificationResponse"
    );
    expectJsonSchemaReference(
      emailVerificationConfirmOperation,
      "200",
      "EmailVerificationConfirmResponse"
    );
    expectJsonSchemaReference(meOperation, "200", "CurrentUserResponse");

    const authSchema = expectSchema(document, "AuthResponse");
    expect(authSchema.properties?.accessToken).toMatchObject({ type: "string" });
    expectSchemaPropertyReference(authSchema, "user", "PublicUserResponse");

    const currentUserSchema = expectSchema(document, "CurrentUserResponse");
    expectSchemaPropertyReference(currentUserSchema, "user", "PublicUserResponse");

    const emailVerificationSchema = expectSchema(document, "EmailVerificationResponse");
    expect(emailVerificationSchema.properties?.message).toMatchObject({ type: "string" });

    const emailVerificationConfirmSchema = expectSchema(
      document,
      "EmailVerificationConfirmResponse"
    );
    expectSchemaPropertyReference(emailVerificationConfirmSchema, "user", "PublicUserResponse");

    const publicUserSchema = expectSchema(document, "PublicUserResponse");
    expect(publicUserSchema.properties?.id).toMatchObject({ type: "string" });
    expect(publicUserSchema.properties?.email).toMatchObject({ type: "string" });
    expect(publicUserSchema.properties?.emailVerified).toMatchObject({ type: "boolean" });
    expect(publicUserSchema.properties?.name).toMatchObject({ type: "string" });
  });

  it("requests and confirms email verification with a single-use token", async () => {
    const server = getServer(app);
    const delivery = getEmailVerificationDelivery(app);
    const payload = {
      ...testAccount("verify-single-use"),
    };

    delivery.drainMessages();

    const signupResponse = await request(server).post("/auth/signup").send(payload).expect(201);
    expect(signupResponse.body.user.emailVerified).toBe(false);

    await request(server)
      .post("/auth/email-verification/request")
      .send({ email: payload.email })
      .expect(202);

    const messages = delivery.drainMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ email: payload.email, token: expect.any(String) });

    const confirmResponse = await request(server)
      .post("/auth/email-verification/confirm")
      .send({ email: payload.email, token: messages[0]?.token })
      .expect(200);

    expect(confirmResponse.body).toEqual({
      user: {
        email: payload.email,
        emailVerified: true,
        id: signupResponse.body.user.id,
        name: payload.name,
      },
    });

    await request(server)
      .post("/auth/email-verification/confirm")
      .send({ email: payload.email, token: messages[0]?.token })
      .expect(400);
  });

  it("returns a safe generic email verification request response for unknown and verified emails", async () => {
    const server = getServer(app);
    const delivery = getEmailVerificationDelivery(app);
    const payload = {
      ...testAccount("already-verified-email-verification"),
    };

    delivery.drainMessages();

    const unknownEmailResponse = await request(server)
      .post("/auth/email-verification/request")
      .send({ email: testEmail("unknown-email-verification") })
      .expect(202);

    expect(unknownEmailResponse.body).toEqual({
      message: "If an account exists for that email, a verification link has been prepared.",
    });
    expect(delivery.drainMessages()).toEqual([]);

    await request(server).post("/auth/signup").send(payload).expect(201);
    await request(server)
      .post("/auth/email-verification/request")
      .send({ email: payload.email })
      .expect(202);

    const messages = delivery.drainMessages();
    expect(messages).toHaveLength(1);

    await request(server)
      .post("/auth/email-verification/confirm")
      .send({ email: payload.email, token: messages[0]?.token })
      .expect(200);
    expect(delivery.drainMessages()).toEqual([]);
    readThrottleAttempts(getThrottleService(app)).clear();

    const verifiedEmailResponse = await request(server)
      .post("/auth/email-verification/request")
      .send({ email: payload.email })
      .expect(202);

    expect(verifiedEmailResponse.body).toEqual({
      message: "If an account exists for that email, a verification link has been prepared.",
    });
    expect(delivery.drainMessages()).toEqual([]);
  });

  it("safely rejects wrong-account and malformed verification tokens", async () => {
    const server = getServer(app);
    const delivery = getEmailVerificationDelivery(app);
    const ownerPayload = {
      ...testAccount("verification-owner"),
    };
    const otherPayload = {
      ...testAccount("verification-other"),
    };

    delivery.drainMessages();

    await request(server).post("/auth/signup").send(ownerPayload).expect(201);
    await request(server).post("/auth/signup").send(otherPayload).expect(201);
    await request(server)
      .post("/auth/email-verification/request")
      .send({ email: ownerPayload.email })
      .expect(202);

    const messages = delivery.drainMessages();
    expect(messages).toHaveLength(1);
    const token = messages[0]?.token;

    await request(server)
      .post("/auth/email-verification/confirm")
      .send({ email: otherPayload.email, token })
      .expect(400);

    await request(server)
      .post("/auth/email-verification/confirm")
      .send({ email: ownerPayload.email, token: testToken("mismatched-confirm") })
      .expect(400);
  });

  it("rejects invalid signup input", async () => {
    await request(getServer(app))
      .post("/auth/signup")
      .send({ email: "not-email", name: "Al", password: testPassword("invalid-input") })
      .expect(400);
  });

  it("returns a generic message for signin failures", async () => {
    const server = getServer(app);
    const payload = {
      ...testAccount("generic-signin-failure"),
    };

    await request(server).post("/auth/signup").send(payload).expect(201);

    const wrongPasswordResponse = await request(server)
      .post("/auth/signin")
      .send({ email: payload.email, password: testPassword("wrong-signin") })
      .expect(401);

    expect(wrongPasswordResponse.body.message).toBe("Invalid email or password.");

    const unknownEmailResponse = await request(server)
      .post("/auth/signin")
      .send({ email: testEmail("unknown-signin-failure"), password: payload.password })
      .expect(401);

    expect(unknownEmailResponse.body.message).toBe("Invalid email or password.");
  });

  it("throttles repeated signin attempts", async () => {
    const payload = { email: testEmail("throttled"), password: testPassword("throttled") };

    await request(getServer(app)).post("/auth/signin").send(payload).expect(401);
    await request(getServer(app)).post("/auth/signin").send(payload).expect(401);

    const throttledResponse = await request(getServer(app))
      .post("/auth/signin")
      .send(payload)
      .expect(429);

    expect(throttledResponse.body.message).toBe(
      "Too many authentication attempts. Please try again later."
    );
  });

  it("throttles repeated email verification requests", async () => {
    const payload = { email: testEmail("verification-throttled") };

    await request(getServer(app))
      .post("/auth/email-verification/request")
      .send(payload)
      .expect(202);
    await request(getServer(app))
      .post("/auth/email-verification/request")
      .send(payload)
      .expect(202);

    const throttledResponse = await request(getServer(app))
      .post("/auth/email-verification/request")
      .send(payload)
      .expect(429);

    expect(throttledResponse.body.message).toBe(
      "Too many authentication attempts. Please try again later."
    );
  });

  it("throttles repeated email verification confirm attempts", async () => {
    const payload = {
      email: testEmail("verification-confirm-throttled"),
      token: testToken("invalid-confirm"),
    };

    await request(getServer(app))
      .post("/auth/email-verification/confirm")
      .send(payload)
      .expect(400);
    await request(getServer(app))
      .post("/auth/email-verification/confirm")
      .send(payload)
      .expect(400);

    const throttledResponse = await request(getServer(app))
      .post("/auth/email-verification/confirm")
      .send(payload)
      .expect(429);

    expect(throttledResponse.body.message).toBe(
      "Too many authentication attempts. Please try again later."
    );
  });

  it("returns a sanitized duplicate signup response", async () => {
    const server = getServer(app);
    const payload = {
      ...testAccount("sanitized-duplicate"),
    };

    await request(server).post("/auth/signup").send(payload).expect(201);

    const duplicateResponse = await request(server).post("/auth/signup").send(payload).expect(409);

    expect(JSON.stringify(duplicateResponse.body).toLowerCase()).not.toContain("exists");
    expect(duplicateResponse.body.message).toBe(
      "Unable to create account with the provided details."
    );
  });

  it("rejects duplicate signup email", async () => {
    const server = getServer(app);
    const payload = {
      ...testAccount("duplicate"),
    };

    await request(server).post("/auth/signup").send(payload).expect(201);
    await request(server).post("/auth/signup").send(payload).expect(409);
  });

  it("rejects invalid credentials and missing bearer tokens", async () => {
    const server = getServer(app);
    const payload = {
      ...testAccount("wrong-password"),
    };

    await request(server).post("/auth/signup").send(payload).expect(201);

    await request(server)
      .post("/auth/signin")
      .send({ email: payload.email, password: testPassword("wrong-password") })
      .expect(401);

    await request(server)
      .post("/auth/signin")
      .send({ email: testEmail("missing"), password: payload.password })
      .expect(401);

    await request(server).get("/auth/me").expect(401);
  });

  it("rejects malformed bearer tokens", async () => {
    const server = getServer(app);

    const signinResponse = await request(server)
      .post("/auth/signup")
      .send(testAccount("malformed"))
      .expect(201);
    const accessToken = getAccessToken(signinResponse);

    await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${accessToken} extra`)
      .expect(401);
  });

  it("rejects valid tokens with malformed subject values", async () => {
    const server = getServer(app);
    const accessToken = await getJwtService(app).signAsync({
      email: testEmail("malformed-subject"),
      sub: "not-an-object-id",
    });

    await request(server).get("/auth/me").set("Authorization", `Bearer ${accessToken}`).expect(401);
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

function getJwtService(app: INestApplication | undefined): JwtService {
  if (app === undefined) {
    throw new Error("Nest app was not initialized.");
  }

  return app.get(JwtService);
}

function getThrottleService(app: INestApplication | undefined): AuthThrottleService {
  if (app === undefined) {
    throw new Error("Nest app was not initialized.");
  }

  return app.get(AuthThrottleService);
}

function getEmailVerificationDelivery(
  app: INestApplication | undefined
): InMemoryEmailVerificationDelivery {
  if (app === undefined) {
    throw new Error("Nest app was not initialized.");
  }

  return app.get(EMAIL_VERIFICATION_DELIVERY);
}

function readThrottleAttempts(service: AuthThrottleService): Map<string, unknown> {
  return (service as unknown as { attempts: Map<string, unknown> }).attempts;
}

function testAccount(label: string): { email: string; name: string; password: string } {
  return {
    email: testEmail(label),
    name: `Test ${label} ${randomUUID()}`,
    password: testPassword(label),
  };
}

function testEmail(label: string): string {
  return `${label.slice(0, 12)}-${randomUUID()}@example.test`;
}

function testPassword(label: string): string {
  return `Password-${label}-${randomUUID()}1!`;
}

function testToken(label: string): string {
  return `${label}-${randomUUID()}`;
}

function expectPostOperation(document: unknown, path: string): OpenApiOperation {
  const operation = (document as OpenApiDocument).paths?.[path]?.post;
  expect(operation).toBeDefined();

  if (operation === undefined) {
    throw new Error(`Expected OpenAPI POST operation for ${path}.`);
  }

  return operation;
}

function expectGetOperation(document: unknown, path: string): OpenApiOperation {
  const operation = (document as OpenApiDocument).paths?.[path]?.get;
  expect(operation).toBeDefined();

  if (operation === undefined) {
    throw new Error(`Expected OpenAPI GET operation for ${path}.`);
  }

  return operation;
}

function expectSchema(document: unknown, schemaName: string): OpenApiSchemaObject {
  const schema = (document as OpenApiDocument).components?.schemas?.[schemaName];
  expect(schema).toBeDefined();

  if (schema === undefined) {
    throw new Error(`Expected OpenAPI schema ${schemaName}.`);
  }

  return schema;
}

function expectJsonSchemaReference(
  operation: OpenApiOperation,
  statusCode: string,
  schemaName: string
): void {
  const schema = operation.responses?.[statusCode]?.content?.["application/json"]?.schema;

  expect(schema).toEqual({ $ref: `#/components/schemas/${schemaName}` });
}

function expectSchemaPropertyReference(
  schema: OpenApiSchemaObject,
  propertyName: string,
  schemaName: string
): void {
  const property = schema.properties?.[propertyName];
  const expectedReference = `#/components/schemas/${schemaName}`;

  expect(property).toBeDefined();

  if (property === undefined) {
    throw new Error(`Expected OpenAPI property ${propertyName}.`);
  }

  const directReference = "$ref" in property ? property.$ref : undefined;
  const composedReference = "allOf" in property ? property.allOf?.[0]?.$ref : undefined;

  expect(directReference ?? composedReference).toBe(expectedReference);
}

async function waitForMongo(uri: string): Promise<void> {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
  } finally {
    await client.close();
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
  } else {
    process.env[name] = value;
  }
}
