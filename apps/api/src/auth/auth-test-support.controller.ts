import { Controller, Get, Inject, NotFoundException, Query } from "@nestjs/common";
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
  private readonly passwordResetCache: AuthTestTokenMessageResponse[] = [];
  private readonly verificationCache: AuthTestTokenMessageResponse[] = [];

  constructor(@Inject(AUTH_TOKEN_DELIVERY) private readonly delivery: AuthTokenDelivery) {}

  @Get("verification")
  drainVerificationMessages(@Query("email") email?: string): AuthTestTokenDeliveryResponse {
    return drainCachedMessages(
      this.verificationCache,
      this.getInMemoryDelivery().drainVerificationMessages().map(toResponseMessage),
      email
    );
  }

  @Get("password-reset")
  drainPasswordResetMessages(@Query("email") email?: string): AuthTestTokenDeliveryResponse {
    return drainCachedMessages(
      this.passwordResetCache,
      this.getInMemoryDelivery().drainPasswordResetMessages().map(toResponseMessage),
      email
    );
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

function drainCachedMessages(
  cache: AuthTestTokenMessageResponse[],
  freshMessages: AuthTestTokenMessageResponse[],
  email?: string
): AuthTestTokenDeliveryResponse {
  cache.push(...freshMessages);

  if (email !== undefined) {
    const index = cache.findIndex((message) => message.email === email);
    if (index === -1) {
      return { messages: [] };
    }

    const message = cache[index];
    if (message === undefined) {
      return { messages: [] };
    }

    cache.splice(index, 1);
    return { messages: [message] };
  }

  return { messages: cache.splice(0) };
}
