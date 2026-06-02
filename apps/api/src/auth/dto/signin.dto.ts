import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class SigninDto {
  @ApiProperty({ example: "person@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Password1!" })
  @IsString()
  password!: string;
}
