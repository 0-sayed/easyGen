import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches } from "class-validator";

import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "../password-policy";

export class ChangePasswordDto {
  @ApiProperty({ example: "Password1!" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: "NewPassword1!", minLength: 8 })
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS })
  newPassword!: string;
}
