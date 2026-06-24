import { Inject, Injectable, Logger } from "@nestjs/common";

import { AccountActivityRepository } from "./account-activity.repository";
import type { AccountActivityType } from "./account-activity.types";
import type {
  AccountActivityEntryResponse,
  AccountActivityResponse,
} from "./dto/account-activity.response";

const ACCOUNT_ACTIVITY_LIMIT = 20;

const ACTIVITY_DESCRIPTIONS: Record<AccountActivityType, string> = {
  "account.created": "Account created",
  "auth.signed_in": "Signed in",
  "auth.signed_out": "Signed out",
  "email.verified": "Email verified",
};

@Injectable()
export class AccountActivityService {
  private readonly logger = new Logger(AccountActivityService.name);

  constructor(
    @Inject(AccountActivityRepository)
    private readonly accountActivityRepository: AccountActivityRepository
  ) {}

  recordAccountCreated(userId: string, occurredAt = new Date()): Promise<void> {
    return this.record(userId, "account.created", occurredAt);
  }

  recordSignedIn(userId: string, occurredAt = new Date()): Promise<void> {
    return this.record(userId, "auth.signed_in", occurredAt);
  }

  recordSignedOut(userId: string, occurredAt = new Date()): Promise<void> {
    return this.record(userId, "auth.signed_out", occurredAt);
  }

  recordEmailVerified(userId: string, occurredAt = new Date()): Promise<void> {
    return this.record(userId, "email.verified", occurredAt);
  }

  async listRecentForUser(userId: string): Promise<AccountActivityResponse> {
    const activities = await this.accountActivityRepository.listRecentForUser(
      userId,
      ACCOUNT_ACTIVITY_LIMIT
    );

    return {
      activities: activities.map(
        (activity): AccountActivityEntryResponse => ({
          description: ACTIVITY_DESCRIPTIONS[activity.type],
          id: activity.id,
          occurredAt: activity.occurredAt.toISOString(),
          type: activity.type,
        })
      ),
      limit: ACCOUNT_ACTIVITY_LIMIT,
    };
  }

  private async record(userId: string, type: AccountActivityType, occurredAt: Date): Promise<void> {
    try {
      await this.accountActivityRepository.create({ occurredAt, type, userId });
    } catch (error) {
      this.logger.error(
        `Failed to record account activity event "${type}" for user "${userId}".`,
        error instanceof Error ? error.stack : error
      );
    }
  }
}
