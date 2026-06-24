import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ example: "Updated Person", minLength: 3 })
  @IsString()
  @MinLength(3)
  name!: string;
}
