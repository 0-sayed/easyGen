import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class PasswordResetRequestDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;
}
