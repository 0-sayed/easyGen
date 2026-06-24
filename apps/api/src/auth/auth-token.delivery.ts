import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { Inject, Injectable, Optional } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

export const AUTH_TOKEN_DELIVERY = Symbol("AUTH_TOKEN_DELIVERY");
const IN_MEMORY_AUTH_TOKEN_DELIVERY_MAX_MESSAGES = Symbol(
  "IN_MEMORY_AUTH_TOKEN_DELIVERY_MAX_MESSAGES"
);
const DEFAULT_IN_MEMORY_MAX_MESSAGES = 100;
const PASSWORD_RESET_TOKEN_ENCRYPTION_ALGORITHM = "aes-256-gcm";
const PASSWORD_RESET_TOKEN_IV_BYTES = 12;

export interface AuthTokenDeliveryMessage {
  email: string;
  expiresAt: Date;
  token: string;
}

export interface AuthTokenDelivery {
  sendPasswordResetToken(message: AuthTokenDeliveryMessage): Promise<void>;
  sendVerificationToken(message: AuthTokenDeliveryMessage): Promise<void>;
}

@Injectable()
export class InMemoryAuthTokenDelivery implements AuthTokenDelivery {
  private readonly encryptionKey = randomBytes(32);
  private readonly passwordResetMessages: EncryptedAuthTokenDeliveryMessage[] = [];
  private readonly verificationMessages: AuthTokenDeliveryMessage[] = [];

  constructor(
    @Optional()
    @Inject(IN_MEMORY_AUTH_TOKEN_DELIVERY_MAX_MESSAGES)
    private readonly maxMessages = DEFAULT_IN_MEMORY_MAX_MESSAGES
  ) {
    if (!Number.isInteger(maxMessages) || maxMessages < 1) {
      throw new Error("maxMessages must be a positive integer.");
    }
  }

  async sendPasswordResetToken(message: AuthTokenDeliveryMessage): Promise<void> {
    this.pushBounded(this.passwordResetMessages, encryptMessage(message, this.encryptionKey));
    await Promise.resolve();
  }

  async sendVerificationToken(message: AuthTokenDeliveryMessage): Promise<void> {
    this.pushBounded(this.verificationMessages, message);
    await Promise.resolve();
  }

  drainPasswordResetMessages(): AuthTokenDeliveryMessage[] {
    return this.passwordResetMessages
      .splice(0)
      .map((message) => decryptMessage(message, this.encryptionKey));
  }

  drainVerificationMessages(): AuthTokenDeliveryMessage[] {
    return this.verificationMessages.splice(0).map(copyMessage);
  }

  private pushBounded<T extends AuthTokenDeliveryMessage | EncryptedAuthTokenDeliveryMessage>(
    messages: T[],
    message: T
  ): void {
    messages.push(structuredClone(message));
    messages.splice(0, Math.max(0, messages.length - this.maxMessages));
  }
}

interface AuthTokenLogSink {
  info(payload: AuthTokenLogPayload, message: string): void;
}

interface AuthTokenLogPayload {
  email: string;
  event: "auth.email_verification.token" | "auth.password_reset.token";
  expiresAt: string;
}

@Injectable()
export class LogAuthTokenDelivery implements AuthTokenDelivery {
  constructor(@Inject(PinoLogger) private readonly logger: AuthTokenLogSink) {}

  async sendPasswordResetToken(message: AuthTokenDeliveryMessage): Promise<void> {
    this.logToken(message, "auth.password_reset.token", "password reset token prepared");
    await Promise.resolve();
  }

  async sendVerificationToken(message: AuthTokenDeliveryMessage): Promise<void> {
    this.logToken(message, "auth.email_verification.token", "email verification token prepared");
    await Promise.resolve();
  }

  private logToken(
    message: AuthTokenDeliveryMessage,
    event: AuthTokenLogPayload["event"],
    logMessage: string
  ): void {
    this.getLogSink().info(
      {
        email: message.email,
        event,
        expiresAt: message.expiresAt.toISOString(),
      },
      logMessage
    );
  }

  private getLogSink(): AuthTokenLogSink {
    const rootLogger = Reflect.get(PinoLogger, "root");
    return isAuthTokenLogSink(rootLogger) ? rootLogger : this.logger;
  }
}

function copyMessage(message: AuthTokenDeliveryMessage): AuthTokenDeliveryMessage {
  return {
    email: message.email,
    expiresAt: new Date(message.expiresAt),
    token: message.token,
  };
}

interface EncryptedAuthTokenDeliveryMessage {
  email: string;
  expiresAt: Date;
  encryptedToken: {
    authTag: string;
    ciphertext: string;
    iv: string;
  };
}

function encryptMessage(
  message: AuthTokenDeliveryMessage,
  encryptionKey: Buffer
): EncryptedAuthTokenDeliveryMessage {
  const iv = randomBytes(PASSWORD_RESET_TOKEN_IV_BYTES);
  const cipher = createCipheriv(PASSWORD_RESET_TOKEN_ENCRYPTION_ALGORITHM, encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(message.token, "utf8"), cipher.final()]);

  return {
    email: message.email,
    expiresAt: new Date(message.expiresAt),
    encryptedToken: {
      authTag: cipher.getAuthTag().toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
      iv: iv.toString("base64url"),
    },
  };
}

function decryptMessage(
  message: EncryptedAuthTokenDeliveryMessage,
  encryptionKey: Buffer
): AuthTokenDeliveryMessage {
  const decipher = createDecipheriv(
    PASSWORD_RESET_TOKEN_ENCRYPTION_ALGORITHM,
    encryptionKey,
    Buffer.from(message.encryptedToken.iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(message.encryptedToken.authTag, "base64url"));

  return {
    email: message.email,
    expiresAt: new Date(message.expiresAt),
    token: Buffer.concat([
      decipher.update(Buffer.from(message.encryptedToken.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8"),
  };
}

function isAuthTokenLogSink(value: unknown): value is AuthTokenLogSink {
  return (
    typeof value === "object" &&
    value !== null &&
    "info" in value &&
    typeof value.info === "function"
  );
}
