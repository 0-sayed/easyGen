import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class DeleteAccountDto {
  @ApiProperty({ example: "Password1!" })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;
}
