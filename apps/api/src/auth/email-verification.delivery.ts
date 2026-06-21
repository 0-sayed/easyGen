import { Inject, Injectable, Optional } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

export const EMAIL_VERIFICATION_DELIVERY = Symbol("EMAIL_VERIFICATION_DELIVERY");
const IN_MEMORY_EMAIL_VERIFICATION_DELIVERY_MAX_MESSAGES = Symbol(
  "IN_MEMORY_EMAIL_VERIFICATION_DELIVERY_MAX_MESSAGES"
);
const DEFAULT_IN_MEMORY_MAX_MESSAGES = 100;

export interface EmailVerificationDeliveryMessage {
  email: string;
  expiresAt: Date;
  token: string;
}

export interface EmailVerificationDelivery {
  sendVerificationToken(message: EmailVerificationDeliveryMessage): Promise<void>;
}

@Injectable()
export class InMemoryEmailVerificationDelivery implements EmailVerificationDelivery {
  private readonly messages: EmailVerificationDeliveryMessage[] = [];

  constructor(
    @Optional()
    @Inject(IN_MEMORY_EMAIL_VERIFICATION_DELIVERY_MAX_MESSAGES)
    private readonly maxMessages = DEFAULT_IN_MEMORY_MAX_MESSAGES
  ) {
    if (!Number.isInteger(maxMessages) || maxMessages < 1) {
      throw new Error("maxMessages must be a positive integer.");
    }
  }

  async sendVerificationToken(message: EmailVerificationDeliveryMessage): Promise<void> {
    this.messages.push(copyMessage(message));
    this.messages.splice(0, Math.max(0, this.messages.length - this.maxMessages));
    await Promise.resolve();
  }

  drainMessages(): EmailVerificationDeliveryMessage[] {
    return this.messages.splice(0).map(copyMessage);
  }
}

interface EmailVerificationLogSink {
  info(payload: EmailVerificationLogPayload, message: string): void;
}

interface EmailVerificationLogPayload {
  email: string;
  event: "auth.email_verification.token";
  expiresAt: string;
  token: string;
}

@Injectable()
export class LogEmailVerificationDelivery implements EmailVerificationDelivery {
  constructor(@Inject(PinoLogger) private readonly logger: EmailVerificationLogSink) {}

  async sendVerificationToken(message: EmailVerificationDeliveryMessage): Promise<void> {
    this.getLogSink().info(
      {
        email: message.email,
        event: "auth.email_verification.token",
        expiresAt: message.expiresAt.toISOString(),
        token: message.token,
      },
      "email verification token prepared"
    );
    await Promise.resolve();
  }

  private getLogSink(): EmailVerificationLogSink {
    const rootLogger = Reflect.get(PinoLogger, "root");
    return isEmailVerificationLogSink(rootLogger) ? rootLogger : this.logger;
  }
}

function copyMessage(message: EmailVerificationDeliveryMessage): EmailVerificationDeliveryMessage {
  return {
    email: message.email,
    expiresAt: new Date(message.expiresAt),
    token: message.token,
  };
}

function isEmailVerificationLogSink(value: unknown): value is EmailVerificationLogSink {
  return (
    typeof value === "object" &&
    value !== null &&
    "info" in value &&
    typeof value.info === "function"
  );
}
