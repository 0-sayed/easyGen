import { describe, expect, it } from "vitest";

import { AuthModule } from "./auth.module";
import {
  EMAIL_VERIFICATION_DELIVERY,
  InMemoryEmailVerificationDelivery,
  LogEmailVerificationDelivery,
} from "./email-verification.delivery";

describe("AuthModule", () => {
  it("binds runtime email verification delivery to the log delivery implementation", () => {
    const providersMetadata: unknown = Reflect.getMetadata("providers", AuthModule);
    if (!Array.isArray(providersMetadata)) {
      throw new Error("Expected AuthModule providers metadata.");
    }

    const providers = providersMetadata;
    const deliveryProvider = providers.find(isEmailVerificationDeliveryProvider);

    expect(deliveryProvider).toEqual({
      provide: EMAIL_VERIFICATION_DELIVERY,
      useExisting: LogEmailVerificationDelivery,
    });
    expect(deliveryProvider).not.toMatchObject({
      useExisting: InMemoryEmailVerificationDelivery,
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
    provider.provide === EMAIL_VERIFICATION_DELIVERY
  );
}
