import { Injectable } from "@nestjs/common";

export const EMAIL_VERIFICATION_DELIVERY = Symbol("EMAIL_VERIFICATION_DELIVERY");

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

  async sendVerificationToken(message: EmailVerificationDeliveryMessage): Promise<void> {
    this.messages.push(copyMessage(message));
    await Promise.resolve();
  }

  drainMessages(): EmailVerificationDeliveryMessage[] {
    return this.messages.splice(0).map(copyMessage);
  }
}

function copyMessage(message: EmailVerificationDeliveryMessage): EmailVerificationDeliveryMessage {
  return {
    email: message.email,
    expiresAt: new Date(message.expiresAt),
    token: message.token,
  };
}
