import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class EmailVerificationConfirmDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "u8OrRY8w9nT_auLU7z2dXsvQ4u-s3IQp5No6H31g0tA" })
  @IsString()
  token!: string;
}
