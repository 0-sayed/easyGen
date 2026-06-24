import { ApiProperty } from "@nestjs/swagger";

export class PasswordResetResponse {
  @ApiProperty({
    example: "If an account exists for that email, a password reset link has been prepared.",
  })
  message!: string;
}
