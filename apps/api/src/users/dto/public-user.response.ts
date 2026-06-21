import { ApiProperty } from "@nestjs/swagger";

import type { PublicUser } from "../user.types";

export class PublicUserResponse implements PublicUser {
  @ApiProperty({
    description: "Stable public user identifier.",
    example: "65f1d3a6a8f1b2c3d4e5f678",
  })
  id!: string;

  @ApiProperty({
    description: "User email address used for authentication.",
    example: "person@example.com",
    format: "email",
  })
  email!: string;

  @ApiProperty({
    description: "Display name for the user account.",
    example: "Person Name",
  })
  name!: string;
}
