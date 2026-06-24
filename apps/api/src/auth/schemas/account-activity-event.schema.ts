import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { ACCOUNT_ACTIVITY_TYPES, type AccountActivityType } from "../account-activity.types";

@Schema({ collection: "account_activity_events", timestamps: true })
export class AccountActivityEvent {
  @Prop({ required: true, type: String })
  userId!: string;

  @Prop({ enum: ACCOUNT_ACTIVITY_TYPES, required: true, type: String })
  type!: AccountActivityType;

  @Prop({ required: true, type: Date })
  occurredAt!: Date;
}

export const AccountActivityEventSchema = SchemaFactory.createForClass(AccountActivityEvent);

AccountActivityEventSchema.index({ userId: 1, occurredAt: -1 });
