import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthService } from "./auth.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { CurrentUserResponse } from "./dto/current-user.response";
import { SigninDto } from "./dto/signin.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("signup")
  @ApiCreatedResponse({
    description: "User account created and access token issued.",
    type: AuthResponse,
  })
  @ApiBadRequestResponse({ description: "Signup input failed validation." })
  @ApiConflictResponse({ description: "A user with this email already exists." })
  signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(dto);
  }

  @Post("signin")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Access token issued for valid credentials.",
    type: AuthResponse,
  })
  @ApiBadRequestResponse({ description: "Signin input failed validation." })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  signin(@Body() dto: SigninDto): Promise<AuthResponse> {
    return this.authService.signin(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: "Current authenticated user.",
    type: CurrentUserResponse,
  })
  @ApiUnauthorizedResponse({ description: "Missing, malformed, expired, or invalid token." })
  async me(@Req() request: AuthenticatedRequest): Promise<CurrentUserResponse> {
    const user = await this.authService.getCurrentUser(request.user.sub);
    return { user };
  }
}
