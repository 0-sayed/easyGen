import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class EmailVerificationRequestDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;
}
