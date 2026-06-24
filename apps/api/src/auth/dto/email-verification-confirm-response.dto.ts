import { ApiProperty } from "@nestjs/swagger";

import { PublicUserResponse } from "../../users/dto/public-user.response";

export class EmailVerificationConfirmResponse {
  @ApiProperty({
    description: "Verified public user profile.",
    type: PublicUserResponse,
  })
  user!: PublicUserResponse;
}
