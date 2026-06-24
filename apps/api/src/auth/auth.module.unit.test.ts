import { describe, expect, it } from "vitest";

import { AuthModule } from "./auth.module";
import { AUTH_TOKEN_DELIVERY, LogAuthTokenDelivery } from "./auth-token.delivery";

describe("AuthModule", () => {
  it("binds runtime auth token delivery to the documented logging implementation", () => {
    const providersMetadata: unknown = Reflect.getMetadata("providers", AuthModule);
    if (!Array.isArray(providersMetadata)) {
      throw new Error("Expected AuthModule providers metadata.");
    }

    const providers = providersMetadata;
    const deliveryProvider = providers.find(isEmailVerificationDeliveryProvider);

    expect(deliveryProvider).toEqual({
      provide: AUTH_TOKEN_DELIVERY,
      useExisting: LogAuthTokenDelivery,
    });
  });
});

function isEmailVerificationDeliveryProvider(
  provider: unknown
): provider is { provide: symbol; useExisting: unknown } {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "provide" in provider &&
    provider.provide === AUTH_TOKEN_DELIVERY
  );
}
