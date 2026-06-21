import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";

import type { AuthenticatedRequest } from "./authenticated-request";
import { AuthAuditLogger } from "./auth-audit.logger";
import { buildAuthRequestContext, buildTokenRequestContext } from "./auth-request-context";
import type { AuthRequestContext } from "./auth-request-context";
import { AuthService } from "./auth.service";
import { AuthThrottleScope, AuthThrottleService } from "./auth-throttle.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { CurrentUserResponse } from "./dto/current-user.response";
import { SigninDto } from "./dto/signin.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(
      HttpException.createBody(message, "Too Many Requests", HttpStatus.TOO_MANY_REQUESTS),
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(AuthThrottleService) private readonly authThrottleService: AuthThrottleService,
    @Inject(AuthAuditLogger) private readonly authAuditLogger: AuthAuditLogger
  ) {}

  @Post("signup")
  @ApiCreatedResponse({
    description: "User account created and access token issued.",
    type: AuthResponse,
  })
  @ApiBadRequestResponse({ description: "Signup input failed validation." })
  @ApiConflictResponse({ description: "Signup could not be completed with the provided email." })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  async signup(@Req() request: Request, @Body() dto: SignupDto): Promise<AuthResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("signup", context);

    try {
      const response = await this.authService.signup(dto);
      this.authAuditLogger.logSignupSuccess({ ...context, userId: response.user.id });
      return response;
    } catch (error) {
      this.authAuditLogger.logSignupFailure({ ...context, reason: "signup_rejected" });
      throw error;
    }
  }

  @Post("signin")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Access token issued for valid credentials.",
    type: AuthResponse,
  })
  @ApiBadRequestResponse({ description: "Signin input failed validation." })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  async signin(@Req() request: Request, @Body() dto: SigninDto): Promise<AuthResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("signin", context);

    try {
      const response = await this.authService.signin(dto);
      this.authAuditLogger.logSigninSuccess({ ...context, userId: response.user.id });
      return response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.authAuditLogger.logSigninFailure({ ...context, reason: "invalid_credentials" });
      }

      throw error;
    }
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
    try {
      const user = await this.authService.getCurrentUser(request.user.sub);
      return { user };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.authAuditLogger.logUserLookupFailure({
          ...buildTokenRequestContext(request),
          userId: request.user.sub,
        });
      }

      throw error;
    }
  }

  private enforceThrottle(
    scope: AuthThrottleScope,
    context: AuthRequestContext & { email: string }
  ): void {
    const throttleResult = this.authThrottleService.consume({
      email: context.email,
      ip: context.ip,
      scope,
    });

    if (!throttleResult.allowed) {
      this.authAuditLogger.logThrottleBlocked(context);
      throw new TooManyRequestsException(
        "Too many authentication attempts. Please try again later."
      );
    }
  }
}
