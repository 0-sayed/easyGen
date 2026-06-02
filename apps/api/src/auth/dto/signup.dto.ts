import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Matches, MinLength } from "class-validator";

import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from "../password-policy";

export class SignupDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Person Name", minLength: 3 })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: "Password1!", minLength: 8 })
  @IsString()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS })
  password!: string;
}
