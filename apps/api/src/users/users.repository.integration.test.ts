import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import type { Model } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { User, UserSchema } from "./schemas/user.schema";
import { UsersRepository } from "./users.repository";

describe("UsersRepository persistence contract", () => {
  let container: StartedMongoDBContainer | undefined;
  let moduleRef: TestingModule | undefined;
  let repository: UsersRepository | undefined;
  let userModel: Model<User> | undefined;

  beforeAll(async () => {
    container = await new MongoDBContainer("mongo:8.0").start();
    const host = container.getHost();
    const mappedPort = String(container.getMappedPort(27017));
    const mongoUri = `mongodb://${host}:${mappedPort}/easygen_users_repository_test?directConnection=true`;

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri, { serverSelectionTimeoutMS: 10_000 }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [UsersRepository],
    }).compile();

    repository = moduleRef.get(UsersRepository);
    userModel = moduleRef.get<Model<User>>(getModelToken(User.name));
    await userModel.init();
  });

  beforeEach(async () => {
    await getUserModel().deleteMany({});
  });

  afterAll(async () => {
    try {
      await moduleRef?.close();
    } finally {
      await container?.stop();
    }
  });

  it("stores normalized email and finds by normalized signin input", async () => {
    const createdUser = await getRepository().create({
      email: "  PERSON@Example.COM  ",
      name: "Person Name",
      passwordHash: "hashed-password",
    });

    expect(createdUser).toEqual({
      email: "person@example.com",
      id: expect.any(String),
      name: "Person Name",
      passwordHash: "hashed-password",
    });

    const storedUser = await getUserModel().findById(createdUser.id).lean().exec();
    expect(storedUser).toMatchObject({
      email: "person@example.com",
      name: "Person Name",
    });

    await expect(getRepository().findByEmail("  PERSON@example.COM  ")).resolves.toEqual(
      createdUser
    );
  });

  it("rejects duplicate normalized emails and leaves one normalized document", async () => {
    await getRepository().create({
      email: "duplicate@example.com",
      name: "First User",
      passwordHash: "first-hash",
    });

    await expect(
      getRepository().create({
        email: "  DUPLICATE@EXAMPLE.COM  ",
        name: "Second User",
        passwordHash: "second-hash",
      })
    ).rejects.toMatchObject({ code: 11000 });

    await expect(
      getUserModel().find({ email: "duplicate@example.com" }).lean().exec()
    ).resolves.toEqual([
      expect.objectContaining({
        email: "duplicate@example.com",
        name: "First User",
      }),
    ]);
  });

  it("exposes passwordHash only through findByEmail", async () => {
    const createdUser = await getRepository().create({
      email: "public@example.com",
      name: "Public User",
      passwordHash: "public-hash",
    });

    await expect(getRepository().findPublicById(createdUser.id)).resolves.toEqual({
      email: "public@example.com",
      id: createdUser.id,
      name: "Public User",
    });

    await expect(getRepository().findByEmail("public@example.com")).resolves.toEqual({
      email: "public@example.com",
      id: createdUser.id,
      name: "Public User",
      passwordHash: "public-hash",
    });

    const defaultRead = await getUserModel().findById(createdUser.id).lean().exec();
    expect(defaultRead).toEqual(
      expect.objectContaining({
        email: "public@example.com",
        name: "Public User",
      })
    );
    expect(defaultRead).not.toHaveProperty("passwordHash");
  });

  function getRepository(): UsersRepository {
    if (repository === undefined) {
      throw new Error("UsersRepository was not initialized.");
    }

    return repository;
  }

  function getUserModel(): Model<User> {
    if (userModel === undefined) {
      throw new Error("User model was not initialized.");
    }

    return userModel;
  }
});
