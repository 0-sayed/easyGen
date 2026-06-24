import { ApiProperty } from "@nestjs/swagger";

export class EmailVerificationResponse {
  @ApiProperty({
    example: "If an account exists for that email, a verification link has been prepared.",
  })
  message!: string;
}
