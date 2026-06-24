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
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { EmailVerificationConfirmResponse } from "./dto/email-verification-confirm-response.dto";
import { EmailVerificationConfirmDto } from "./dto/email-verification-confirm.dto";
import { EmailVerificationRequestDto } from "./dto/email-verification-request.dto";
import { EmailVerificationResponse } from "./dto/email-verification-response.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { PasswordResetResponse } from "./dto/password-reset-response.dto";
import { SigninDto } from "./dto/signin.dto";
import { SignupDto } from "./dto/signup.dto";
import { EmailVerificationService } from "./email-verification.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PasswordResetService } from "./password-reset.service";

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
    @Inject(EmailVerificationService)
    private readonly emailVerificationService: EmailVerificationService,
    @Inject(PasswordResetService)
    private readonly passwordResetService: PasswordResetService,
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

  @Post("email-verification/request")
  @HttpCode(202)
  @ApiAcceptedResponse({
    description: "Verification delivery prepared when an account exists.",
    type: EmailVerificationResponse,
  })
  @ApiBadRequestResponse({ description: "Email verification request input failed validation." })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  requestEmailVerification(
    @Req() request: Request,
    @Body() dto: EmailVerificationRequestDto
  ): Promise<EmailVerificationResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("email-verification-request", context);

    return this.emailVerificationService.requestVerification(dto);
  }

  @Post("email-verification/confirm")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Email verified for a valid single-use token.",
    type: EmailVerificationConfirmResponse,
  })
  @ApiBadRequestResponse({ description: "Verification token is invalid or expired." })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  confirmEmailVerification(
    @Req() request: Request,
    @Body() dto: EmailVerificationConfirmDto
  ): Promise<EmailVerificationConfirmResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("email-verification-confirm", context);

    return this.emailVerificationService.confirmVerification(dto);
  }

  @Post("password-reset/request")
  @HttpCode(202)
  @ApiAcceptedResponse({
    description: "Password reset delivery prepared when an account exists.",
    type: PasswordResetResponse,
  })
  @ApiBadRequestResponse({ description: "Password reset request input failed validation." })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  requestPasswordReset(
    @Req() request: Request,
    @Body() dto: PasswordResetRequestDto
  ): Promise<PasswordResetResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("password-reset-request", context);

    return this.passwordResetService.requestReset(dto);
  }

  @Post("password-reset/confirm")
  @HttpCode(200)
  @ApiOkResponse({
    description: "Password reset completed for a valid single-use token.",
    type: PasswordResetResponse,
  })
  @ApiBadRequestResponse({
    description: "Password reset token is invalid or expired, or input failed validation.",
  })
  @ApiTooManyRequestsResponse({
    description: "Too many authentication attempts. Please try again later.",
  })
  confirmPasswordReset(
    @Req() request: Request,
    @Body() dto: PasswordResetConfirmDto
  ): Promise<PasswordResetResponse> {
    const context = buildAuthRequestContext(request, dto.email) as AuthRequestContext & {
      email: string;
    };
    this.enforceThrottle("password-reset-confirm", context);

    return this.passwordResetService.confirmReset(dto);
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

  @Post("logout")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: "Current access token revoked." })
  @ApiUnauthorizedResponse({
    description: "Missing, malformed, expired, invalid, or revoked token.",
  })
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    const context = buildTokenRequestContext(request);

    try {
      await this.authService.logout(request.user);
      this.authAuditLogger.logLogoutSuccess({ ...context, userId: request.user.sub });
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.authAuditLogger.logLogoutFailure({ ...context, userId: request.user.sub });
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
