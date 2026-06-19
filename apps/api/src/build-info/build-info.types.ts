import { ApiProperty } from "@nestjs/swagger";

export class BuildInfoResponse {
  @ApiProperty({
    description: "Stable public service identifier for the API.",
    example: "easygen-api",
  })
  service!: "easygen-api";

  @ApiProperty({
    description: "API package version exposed by the running build.",
    example: "0.1.0",
  })
  version!: string;

  @ApiProperty({
    description: "Runtime environment configured for this API process.",
    example: "development",
  })
  environment!: string;
}
