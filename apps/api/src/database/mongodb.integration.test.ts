import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("MongoDB Testcontainers foundation", () => {
  let container: StartedMongoDBContainer | undefined;
  let client: MongoClient | undefined;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    client = new MongoClient(`mongodb://${host}:${mappedPort}/easygen_test?directConnection=true`);
    await client.connect();
  });

  afterAll(async () => {
    await client?.close();
    await container?.stop();
  });

  it("persists and reads data through a real MongoDB service", async () => {
    if (client === undefined) {
      throw new Error("MongoDB client was not initialized.");
    }

    const collection = client.db("easygen_test").collection<{ name: string }>("smoke_tests");

    await collection.insertOne({ name: "testing-foundation" });

    await expect(collection.findOne({ name: "testing-foundation" })).resolves.toMatchObject({
      name: "testing-foundation",
    });
  });
});
