import { Controller, Get, Inject, NotFoundException } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import {
  AUTH_TOKEN_DELIVERY,
  type AuthTokenDelivery,
  type AuthTokenDeliveryMessage,
  InMemoryAuthTokenDelivery,
} from "./auth-token.delivery";

interface AuthTestTokenMessageResponse {
  email: string;
  expiresAt: string;
  token: string;
}

interface AuthTestTokenDeliveryResponse {
  messages: AuthTestTokenMessageResponse[];
}

@ApiExcludeController()
@Controller("__test/auth-tokens")
export class AuthTestSupportController {
  constructor(@Inject(AUTH_TOKEN_DELIVERY) private readonly delivery: AuthTokenDelivery) {}

  @Get("verification")
  drainVerificationMessages(): AuthTestTokenDeliveryResponse {
    return {
      messages: this.getInMemoryDelivery().drainVerificationMessages().map(toResponseMessage),
    };
  }

  @Get("password-reset")
  drainPasswordResetMessages(): AuthTestTokenDeliveryResponse {
    return {
      messages: this.getInMemoryDelivery().drainPasswordResetMessages().map(toResponseMessage),
    };
  }

  private getInMemoryDelivery(): InMemoryAuthTokenDelivery {
    if (!isAuthTestSupportEnabled() || !(this.delivery instanceof InMemoryAuthTokenDelivery)) {
      throw new NotFoundException();
    }

    return this.delivery;
  }
}

export function isAuthTestSupportEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "test" && env.AUTH_TEST_SUPPORT === "1";
}

function toResponseMessage(message: AuthTokenDeliveryMessage): AuthTestTokenMessageResponse {
  return {
    email: message.email,
    expiresAt: message.expiresAt.toISOString(),
    token: message.token,
  };
}
