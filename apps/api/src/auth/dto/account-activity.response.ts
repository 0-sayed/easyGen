import { ApiProperty } from "@nestjs/swagger";

import { ACCOUNT_ACTIVITY_TYPES, type AccountActivityType } from "../account-activity.types";

export class AccountActivityEntryResponse {
  @ApiProperty({
    description: "Stable activity entry identifier.",
    example: "65f0f7f9f5f1a10d7b4d1d31",
  })
  id!: string;

  @ApiProperty({
    description: "User-safe account activity type.",
    enum: ACCOUNT_ACTIVITY_TYPES,
    example: "auth.signed_in",
  })
  type!: AccountActivityType;

  @ApiProperty({
    description: "Short user-facing activity summary.",
    example: "Signed in",
  })
  description!: string;

  @ApiProperty({
    description: "ISO timestamp for when the activity occurred.",
    example: "2026-06-24T12:00:00.000Z",
  })
  occurredAt!: string;
}

export class AccountActivityResponse {
  @ApiProperty({
    description: "Newest account activity entries for the current user.",
    type: [AccountActivityEntryResponse],
  })
  activities!: AccountActivityEntryResponse[];

  @ApiProperty({
    description: "Maximum number of entries returned.",
    example: 20,
  })
  limit!: number;
}
