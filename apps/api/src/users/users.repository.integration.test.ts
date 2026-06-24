import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import { MongoDBContainer, type StartedMongoDBContainer } from "@testcontainers/mongodb";
import type { Model } from "mongoose";
import { randomUUID } from "node:crypto";
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

  it("updates only supported public profile fields", async () => {
    const createdUser = await getRepository().create({
      email: "profile@example.com",
      name: "Original Name",
      passwordHash: "profile-hash",
    });

    await expect(
      getRepository().updateProfile(createdUser.id, { name: "Updated Name" })
    ).resolves.toEqual({
      email: "profile@example.com",
      emailVerified: false,
      id: createdUser.id,
      name: "Updated Name",
    });

    await expect(getRepository().findByEmail("profile@example.com")).resolves.toMatchObject({
      email: "profile@example.com",
      name: "Updated Name",
      passwordHash: "profile-hash",
    });
  });

  it("loads and updates password hashes without exposing them publicly", async () => {
    const createdUser = await getRepository().create({
      email: "password-change@example.com",
      name: "Password Change",
      passwordHash: "old-hash",
    });

    await expect(getRepository().findByIdWithPasswordHash(createdUser.id)).resolves.toEqual({
      email: "password-change@example.com",
      emailVerified: false,
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Password Change",
      passwordHash: "old-hash",
    });

    await getRepository().updatePasswordHash(createdUser.id, "new-hash");

    await expect(getRepository().findByIdWithPasswordHash(createdUser.id)).resolves.toMatchObject({
      id: createdUser.id,
      passwordHash: "new-hash",
    });
    await expect(getRepository().findPublicById(createdUser.id)).resolves.not.toHaveProperty(
      "passwordHash"
    );
  });

  it("stores and clears email verification token fields without exposing token hashes publicly", async () => {
    const createdUser = await getRepository().create({
      email: "verify@example.com",
      name: "Verify User",
      passwordHash: "verify-hash",
    });
    const expiresAt = new Date("2026-06-21T11:00:00.000Z");
    const verifiedAt = new Date("2026-06-21T12:00:00.000Z");
    const tokenHash = testTokenHash("verification");
    const staleTokenHash = testTokenHash("stale-verification");

    await expect(
      getRepository().setEmailVerificationToken(createdUser.id, {
        expiresAt,
        tokenHash,
      })
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: tokenHash,
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Verify User",
    });

    await expect(
      getRepository().findVerificationStateByEmail("  VERIFY@example.COM  ")
    ).resolves.toEqual({
      email: "verify@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: tokenHash,
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
        tokenHash: staleTokenHash,
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
    const expectedTokenHash = testTokenHash("expected");
    const otherTokenHash = testTokenHash("other");

    await getRepository().setEmailVerificationToken(createdUser.id, {
      expiresAt,
      tokenHash: expectedTokenHash,
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, otherTokenHash)
    ).resolves.toBe(null);
    await expect(
      getRepository().findVerificationStateByEmail("atomic@example.com")
    ).resolves.toEqual({
      email: "atomic@example.com",
      emailVerificationTokenExpiresAt: expiresAt,
      emailVerificationTokenHash: expectedTokenHash,
      emailVerifiedAt: null,
      id: createdUser.id,
      name: "Atomic User",
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, expiresAt, expectedTokenHash)
    ).resolves.toBe(null);

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, expectedTokenHash)
    ).resolves.toEqual({
      email: "atomic@example.com",
      emailVerificationTokenExpiresAt: null,
      emailVerificationTokenHash: null,
      emailVerifiedAt: verifiedAt,
      id: createdUser.id,
      name: "Atomic User",
    });

    await expect(
      getRepository().markEmailVerifiedForToken(createdUser.id, verifiedAt, expectedTokenHash)
    ).resolves.toBe(null);
  });

  it("returns null for verification state lookups with unknown or malformed user data", async () => {
    await expect(getRepository().findVerificationStateByEmail("missing@example.com")).resolves.toBe(
      null
    );
    await expect(
      getRepository().setEmailVerificationToken("not-an-object-id", {
        expiresAt: new Date("2026-06-21T11:00:00.000Z"),
        tokenHash: testTokenHash("malformed-user"),
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

  function testTokenHash(label: string): string {
    return `${label}-${randomUUID()}`;
  }
});
