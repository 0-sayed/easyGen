import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";

import type {
  AccountActivityEventRecord,
  CreateAccountActivityEventInput,
} from "./account-activity.types";
import { AccountActivityEvent } from "./schemas/account-activity-event.schema";

type AccountActivityEventDocument = AccountActivityEvent & { _id: { toString(): string } };

@Injectable()
export class AccountActivityRepository {
  constructor(
    @InjectModel(AccountActivityEvent.name)
    private readonly accountActivityEventModel: Model<AccountActivityEvent>
  ) {}

  async create(input: CreateAccountActivityEventInput): Promise<void> {
    await this.accountActivityEventModel.create({
      occurredAt: input.occurredAt ?? new Date(),
      type: input.type,
      userId: input.userId,
    });
  }

  async listRecentForUser(userId: string, limit: number): Promise<AccountActivityEventRecord[]> {
    const events = await this.accountActivityEventModel
      .find({ userId })
      .sort({ occurredAt: -1, _id: -1 })
      .limit(limit)
      .lean<AccountActivityEventDocument[]>()
      .exec();

    return events.map((event) => ({
      id: event._id.toString(),
      occurredAt: event.occurredAt,
      type: event.type,
      userId: event.userId,
    }));
  }
}
