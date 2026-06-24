import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import type { Model } from "mongoose";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AccountActivityRepository } from "./account-activity.repository";
import {
  AccountActivityEvent,
  AccountActivityEventSchema,
} from "./schemas/account-activity-event.schema";

describe("AccountActivityRepository persistence contract", () => {
  let container: StartedMongoDBContainer | undefined;
  let moduleRef: TestingModule | undefined;
  let repository: AccountActivityRepository | undefined;
  let model: Model<AccountActivityEvent> | undefined;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    const mongoUri = `mongodb://${host}:${mappedPort}/easygen_account_activity_test?directConnection=true`;

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri, { serverSelectionTimeoutMS: 10_000 }),
        MongooseModule.forFeature([
          { name: AccountActivityEvent.name, schema: AccountActivityEventSchema },
        ]),
      ],
      providers: [AccountActivityRepository],
    }).compile();

    repository = moduleRef.get(AccountActivityRepository);
    model = moduleRef.get<Model<AccountActivityEvent>>(getModelToken(AccountActivityEvent.name));
    await model.init();
  });

  beforeEach(async () => {
    await getModel().deleteMany({});
  });

  afterAll(async () => {
    try {
      await moduleRef?.close();
    } finally {
      await container?.stop();
    }
  });

  it("lists only the selected user's recent safe activity newest first", async () => {
    const ownerId = testUserId("owner");
    const otherId = testUserId("other");

    await getRepository().create({
      occurredAt: new Date("2026-06-24T10:00:00.000Z"),
      type: "account.created",
      userId: ownerId,
    });
    await getRepository().create({
      occurredAt: new Date("2026-06-24T10:01:00.000Z"),
      type: "auth.signed_in",
      userId: otherId,
    });
    await getRepository().create({
      occurredAt: new Date("2026-06-24T10:02:00.000Z"),
      type: "auth.signed_in",
      userId: ownerId,
    });

    await expect(getRepository().listRecentForUser(ownerId, 20)).resolves.toEqual([
      {
        id: expect.any(String),
        occurredAt: new Date("2026-06-24T10:02:00.000Z"),
        type: "auth.signed_in",
        userId: ownerId,
      },
      {
        id: expect.any(String),
        occurredAt: new Date("2026-06-24T10:00:00.000Z"),
        type: "account.created",
        userId: ownerId,
      },
    ]);
  });

  it("applies the caller supplied result limit", async () => {
    const userId = testUserId("limited");

    for (let index = 0; index < 25; index += 1) {
      await getRepository().create({
        occurredAt: new Date(Date.UTC(2026, 5, 24, 10, index, 0)),
        type: "auth.signed_in",
        userId,
      });
    }

    const activities = await getRepository().listRecentForUser(userId, 20);

    expect(activities).toHaveLength(20);
    expect(activities[0]?.occurredAt).toEqual(new Date("2026-06-24T10:24:00.000Z"));
    expect(activities.at(-1)?.occurredAt).toEqual(new Date("2026-06-24T10:05:00.000Z"));
  });

  it("uses a stable newest-created tie-breaker for matching activity timestamps", async () => {
    const userId = testUserId("same-time");
    const occurredAt = new Date("2026-06-24T10:00:00.000Z");

    await getRepository().create({
      occurredAt,
      type: "account.created",
      userId,
    });
    await getRepository().create({
      occurredAt,
      type: "auth.signed_in",
      userId,
    });

    await expect(getRepository().listRecentForUser(userId, 20)).resolves.toMatchObject([
      {
        occurredAt,
        type: "auth.signed_in",
        userId,
      },
      {
        occurredAt,
        type: "account.created",
        userId,
      },
    ]);
  });

  function getRepository(): AccountActivityRepository {
    if (repository === undefined) {
      throw new Error("AccountActivityRepository was not initialized.");
    }

    return repository;
  }

  function getModel(): Model<AccountActivityEvent> {
    if (model === undefined) {
      throw new Error("AccountActivityEvent model was not initialized.");
    }

    return model;
  }
});

function testUserId(label: string): string {
  return `${label}-${randomUUID()}`;
}
