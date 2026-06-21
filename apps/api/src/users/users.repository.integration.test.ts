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
      emailVerified: false,
      emailVerifiedAt: null,
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
      emailVerified: false,
      id: createdUser.id,
      name: "Public User",
    });

    await expect(getRepository().findByEmail("public@example.com")).resolves.toEqual({
      email: "public@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
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

  it("stores and clears email verification token fields without exposing token hashes publicly", async () => {
    const createdUser = await getRepository().create({
      email: "verify@example.com",
      name: "Verify User",
      passwordHash: "verify-hash",
    });
    const expiresAt = new Date("2026-06-21T11:00:00.000Z");
    const verifiedAt = new Date("2026-06-21T12:00:00.000Z");

    await expect(
      getRepository().setEmailVerificationToken(createdUser.id, {
        expiresAt,
        tokenHash: "hashed-verification-token",
      })
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: "hashed-verification-token",
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Verify User",
    });

    await expect(
      getRepository().findVerificationStateByEmail("  VERIFY@example.COM  ")
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: "hashed-verification-token",
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Verify User",
    });

    await expect(getRepository().findPublicById(createdUser.id)).resolves.toEqual({
      email: "verify@example.com",
      emailVerified: false,
      id: createdUser.id,
      name: "Verify User",
    });

    const defaultRead = await getUserModel().findById(createdUser.id).lean().exec();
    expect(defaultRead).not.toHaveProperty("emailVerificationTokenHash");
    expect(defaultRead).not.toHaveProperty("emailVerificationTokenExpiresAt");

    await expect(getRepository().markEmailVerified(createdUser.id, verifiedAt)).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: verifiedAt,
      id: createdUser.id,
      name: "Verify User",
    });

    await expect(
      getRepository().findVerificationStateByEmail("verify@example.com")
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: verifiedAt,
      id: createdUser.id,
      name: "Verify User",
    });

    await expect(
      getRepository().setEmailVerificationToken(createdUser.id, {
        expiresAt: new Date("2026-06-21T13:00:00.000Z"),
        tokenHash: "stale-verification-token",
      })
    ).resolves.toBe(null);

    await expect(
      getRepository().findVerificationStateByEmail("verify@example.com")
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: verifiedAt,
      id: createdUser.id,
      name: "Verify User",
    });
  });

  it("atomically verifies email only for a matching unexpired token hash", async () => {
    const createdUser = await getRepository().create({
      email: "atomic@example.com",
      name: "Atomic User",
      passwordHash: "atomic-hash",
    });
    const expiresAt = new Date("2026-06-21T12:00:00.000Z");
    const verifiedAt = new Date("2026-06-21T11:00:00.000Z");

    await getRepository().setEmailVerificationToken(createdUser.id, {
      expiresAt,
      tokenHash: "expected-token-hash",
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, "other-token-hash")
    ).resolves.toBe(null);
    await expect(
      getRepository().findVerificationStateByEmail("atomic@example.com")
    ).resolves.toEqual({
      email: "atomic@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: "expected-token-hash",
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Atomic User",
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, expiresAt, "expected-token-hash")
    ).resolves.toBe(null);

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, "expected-token-hash")
    ).resolves.toEqual({
      email: "atomic@example.com",
      emailVerificationTokenExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: verifiedAt,
      id: createdUser.id,
      name: "Atomic User",
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, "expected-token-hash")
    ).resolves.toBe(null);
  });

  it("returns null for verification state lookups with unknown or malformed user data", async () => {
    await expect(getRepository().findVerificationStateByEmail("missing@example.com")).resolves.toBe(
      null
    );
    await expect(
      getRepository().setEmailVerificationToken("not-an-object-id", {
        expiresAt: new Date("2026-06-21T11:00:00.000Z"),
        tokenHash: "hashed-verification-token",
      })
    ).resolves.toBe(null);
    await expect(
      getRepository().markEmailVerified("not-an-object-id", new Date("2026-06-21T12:00:00.000Z"))
    ).resolves.toBe(null);
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
