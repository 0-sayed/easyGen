import { createRequire } from "node:module";

import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import { MongoClient, type Db } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

interface Migration {
  up(db: Db): Promise<void>;
}

const loadModule = createRequire(__filename);
const migration = loadModule(
  "../../../../migrations/20260620170500-ensure-users-email-unique-index.cjs"
) as Migration;

describe("users email unique index migration", () => {
  let client: MongoClient | undefined;
  let container: StartedMongoDBContainer | undefined;
  let db: Db | undefined;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    client = new MongoClient(
      `mongodb://${host}:${mappedPort}/easygen_users_email_migration_test?directConnection=true`
    );
    await client.connect();
    db = client.db("easygen_users_email_migration_test");
  });

  beforeEach(async () => {
    await getDb().dropDatabase();
  });

  afterAll(async () => {
    try {
      await client?.close();
    } finally {
      await container?.stop();
    }
  });

  it("fails with a targeted diagnostic when legacy duplicate emails exist", async () => {
    await getDb()
      .collection("users")
      .insertMany([
        { email: "duplicate@example.com", name: "First User" },
        { email: "duplicate@example.com", name: "Second User" },
      ]);

    await expect(migration.up(getDb())).rejects.toThrow(
      /Cannot create unique index email_1: duplicate users\.email values exist\..*Duplicate groups: 1/
    );
    await expect(migration.up(getDb())).rejects.not.toThrow("duplicate@example.com");

    await expect(getDb().collection("users").indexExists("email_1")).resolves.toBe(false);
  });

  function getDb(): Db {
    if (db === undefined) {
      throw new Error("Migration test database was not initialized.");
    }

    return db;
  }
});
