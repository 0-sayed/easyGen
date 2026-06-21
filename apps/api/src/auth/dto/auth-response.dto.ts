import { ApiProperty } from "@nestjs/swagger";

import { PublicUserResponse } from "../../users/dto/public-user.response";

export class AuthResponse {
  @ApiProperty({
    description: "JWT bearer access token for authenticated API requests.",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
  })
  accessToken!: string;

  @ApiProperty({
    description: "Public profile for the authenticated user.",
    type: PublicUserResponse,
  })
  user!: PublicUserResponse;
}
