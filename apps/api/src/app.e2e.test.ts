import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { MongoClient } from "mongodb";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import apiPackage from "../package.json";
import { configureApp } from "./configure-app";

const expectedApiVersion =
  typeof apiPackage.version === "string" && apiPackage.version.trim().length > 0
    ? apiPackage.version
    : "0.0.0";

interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  responses?: Record<string, OpenApiResponseObject>;
}

interface OpenApiResponseObject {
  description?: string;
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
  enum?: unknown[];
  properties?: Record<string, OpenApiSchemaObject | OpenApiReferenceObject>;
}

interface OpenApiDocument {
  tags?: { name?: string; description?: string }[];
  paths?: Record<string, { get?: OpenApiOperation }>;
  components?: { schemas?: Record<string, OpenApiSchemaObject> };
}

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
    await waitForMongo(process.env.MONGODB_URI);
    const { AppModule } = await import("./app.module");

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

  it("serves the readiness endpoint when MongoDB is connected", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer()).get("/ready").expect(200);

    expect(response.body).toEqual({
      checks: {
        database: "ready",
      },
      status: "ready",
    });
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

  it("documents public health, readiness, and status endpoints in OpenAPI output", async () => {
    if (app === undefined) {
      throw new Error("Nest app was not initialized.");
    }

    const response = await request(app.getHttpServer()).get("/docs-json").expect(200);

    expect(expectDocumentTag(response.body, "health").description).toBe(
      "Public liveness endpoint."
    );
    expect(expectDocumentTag(response.body, "ready").description).toBe(
      "Public backing-service readiness endpoint."
    );
    expect(expectDocumentTag(response.body, "status").description).toBe(
      "Public build and environment metadata endpoint."
    );

    const healthOperation = expectGetOperation(response.body, "/health");
    const readyOperation = expectGetOperation(response.body, "/ready");
    const statusOperation = expectGetOperation(response.body, "/status");

    expect(healthOperation.tags).toEqual(["health"]);
    expect(healthOperation.summary).toBe("Health check");
    expect(healthOperation.responses?.["200"]?.description).toBe(
      "API process is accepting requests."
    );
    expectJsonSchemaReference(healthOperation, "200", "HealthResponse");
    expect(response.body.components?.schemas?.HealthResponse?.properties?.status).toMatchObject({
      enum: ["ok"],
      type: "string",
    });
    expect(response.body.components?.schemas?.HealthResponse?.properties?.status?.enum).toEqual([
      "ok",
    ]);

    expect(readyOperation.tags).toEqual(["ready"]);
    expect(readyOperation.summary).toBe("Readiness check");
    expect(readyOperation.responses?.["200"]?.description).toBe(
      "Required backing services are ready."
    );
    expect(readyOperation.responses?.["503"]?.description).toBe(
      "A required backing service is not ready."
    );
    expectJsonSchemaReference(readyOperation, "200", "ReadinessResponse");
    expectJsonSchemaReference(readyOperation, "503", "ReadinessUnavailableResponse");
    expect(response.body.components?.schemas?.ReadinessResponse?.properties?.status).toMatchObject({
      enum: ["ready"],
      type: "string",
    });
    expect(
      response.body.components?.schemas?.ReadinessUnavailableResponse?.properties?.status
    ).toMatchObject({
      enum: ["error"],
      type: "string",
    });

    expect(statusOperation.tags).toEqual(["status"]);
    expect(statusOperation.summary).toBe("Public build status");
    expect(statusOperation.description).toContain("service");
    expect(statusOperation.description).toContain("version");
    expect(statusOperation.description).toContain("environment");
    expect(statusOperation.responses?.["200"]?.description).toBe(
      "Current public service build metadata."
    );
    expectJsonSchemaReference(statusOperation, "200", "BuildInfoResponse");
    expect(response.body.components?.schemas?.BuildInfoResponse?.properties?.service).toMatchObject(
      {
        enum: ["easygen-api"],
        type: "string",
      }
    );
    expect(response.body.components?.schemas?.BuildInfoResponse?.properties?.version).toMatchObject(
      {
        type: "string",
      }
    );
    expect(
      response.body.components?.schemas?.BuildInfoResponse?.properties?.environment
    ).toMatchObject({
      type: "string",
    });
    expect(response.body.components?.schemas?.BuildInfoResponse?.properties?.service?.enum).toEqual(
      ["easygen-api"]
    );
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

function expectDocumentTag(
  document: unknown,
  name: string
): { name?: string; description?: string } {
  const tag = (document as OpenApiDocument).tags?.find((candidate) => candidate.name === name);
  expect(tag).toBeDefined();

  if (tag === undefined) {
    throw new Error(`Expected OpenAPI tag ${name}.`);
  }

  return tag;
}

function expectGetOperation(document: unknown, path: string): OpenApiOperation {
  const operation = (document as OpenApiDocument).paths?.[path]?.get;
  expect(operation).toBeDefined();

  if (operation === undefined) {
    throw new Error(`Expected OpenAPI GET operation for ${path}.`);
  }

  return operation;
}

function expectJsonSchemaReference(
  operation: OpenApiOperation,
  statusCode: string,
  schemaName: string
): void {
  const schema = operation.responses?.[statusCode]?.content?.["application/json"]?.schema;

  expect(schema).toEqual({ $ref: `#/components/schemas/${schemaName}` });
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
