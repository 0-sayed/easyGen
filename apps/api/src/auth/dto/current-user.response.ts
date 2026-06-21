import { ApiProperty } from "@nestjs/swagger";

import { PublicUserResponse } from "../../users/dto/public-user.response";

export class CurrentUserResponse {
  @ApiProperty({
    description: "Public profile for the authenticated user.",
    type: PublicUserResponse,
  })
  user!: PublicUserResponse;
}
