import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches } from "class-validator";

import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "../password-policy";

export class PasswordResetConfirmDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "u8OrRY8w9nT_auLU7z2dXsvQ4u-s3IQp5No6H31g0tA" })
  @IsString()
  token!: string;

  @ApiProperty({ example: "NewPassword1!", minLength: 8 })
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS })
  newPassword!: string;
}
