import { afterEach, describe, expect, it } from "vitest";

import { AuthModule, selectAuthTokenDeliveryProvider } from "./auth.module";
import {
  AUTH_TOKEN_DELIVERY,
  InMemoryAuthTokenDelivery,
  LogAuthTokenDelivery,
} from "./auth-token.delivery";

const originalNodeEnv = process.env.NODE_ENV;
const originalAuthTestSupport = process.env.AUTH_TEST_SUPPORT;

describe("AuthModule", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("binds runtime auth token delivery through a factory provider", () => {
    const providersMetadata: unknown = Reflect.getMetadata("providers", AuthModule);
    if (!Array.isArray(providersMetadata)) {
      throw new Error("Expected AuthModule providers metadata.");
    }

    const providers = providersMetadata;
    const deliveryProvider = providers.find(isAuthTokenDeliveryProvider);

    expect(deliveryProvider).toEqual({
      provide: AUTH_TOKEN_DELIVERY,
      inject: [InMemoryAuthTokenDelivery, LogAuthTokenDelivery],
      useFactory: expect.any(Function),
    });
  });

  it("selects logging delivery unless test support is explicitly enabled", () => {
    const inMemoryDelivery = new InMemoryAuthTokenDelivery();
    const logDelivery = new LogAuthTokenDelivery({ info: () => undefined });
    const deliveryProvider = selectAuthTokenDeliveryProvider();

    delete process.env.NODE_ENV;
    delete process.env.AUTH_TEST_SUPPORT;

    expect(deliveryProvider.useFactory(inMemoryDelivery, logDelivery)).toBe(logDelivery);

    process.env.NODE_ENV = "test";
    delete process.env.AUTH_TEST_SUPPORT;

    expect(deliveryProvider.useFactory(inMemoryDelivery, logDelivery)).toBe(logDelivery);
  });

  it("selects in-memory delivery for explicit test support", () => {
    const inMemoryDelivery = new InMemoryAuthTokenDelivery();
    const logDelivery = new LogAuthTokenDelivery({ info: () => undefined });
    const deliveryProvider = selectAuthTokenDeliveryProvider();

    process.env.NODE_ENV = "test";
    process.env.AUTH_TEST_SUPPORT = "1";

    expect(deliveryProvider.useFactory(inMemoryDelivery, logDelivery)).toBe(inMemoryDelivery);
  });
});

function isAuthTokenDeliveryProvider(provider: unknown): provider is {
  provide: symbol;
  inject: [typeof InMemoryAuthTokenDelivery, typeof LogAuthTokenDelivery];
  useFactory: (
    inMemoryDelivery: InMemoryAuthTokenDelivery,
    logDelivery: LogAuthTokenDelivery
  ) => InMemoryAuthTokenDelivery | LogAuthTokenDelivery;
} {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "provide" in provider &&
    provider.provide === AUTH_TOKEN_DELIVERY
  );
}

function restoreEnv(): void {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalAuthTestSupport === undefined) {
    delete process.env.AUTH_TEST_SUPPORT;
  } else {
    process.env.AUTH_TEST_SUPPORT = originalAuthTestSupport;
  }
}
