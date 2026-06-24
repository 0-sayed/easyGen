import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { AuthAuditLogger } from "./auth-audit.logger";
import { buildTokenRequestContext } from "./auth-request-context";
import { AuthSessionService } from "./auth-session.service";
import type { JwtPayload } from "./jwt-payload";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(AuthAuditLogger) private readonly authAuditLogger: AuthAuditLogger,
    @Inject(AuthSessionService) private readonly authSessionService: AuthSessionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const token = this.extractTokenFromHeader(request);

    if (token === undefined) {
      this.authAuditLogger.logTokenFailure({
        ...buildTokenRequestContext(request),
        reason: request.headers.authorization === undefined ? "missing_token" : "malformed_token",
      });
      throw new UnauthorizedException();
    }

    const payload = await this.verifyToken(request, token);

    try {
      await this.authSessionService.assertActive(payload);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) {
        throw error;
      }

      this.authAuditLogger.logTokenFailure({
        ...buildTokenRequestContext(request),
        reason: "revoked_token",
      });
      throw new UnauthorizedException();
    }

    request.user = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token, extra] = request.headers.authorization?.trim().split(/\s+/) ?? [];

    if (extra !== undefined) {
      return undefined;
    }

    return type?.toLowerCase() === "bearer" ? token : undefined;
  }

  private async verifyToken(request: Request, token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      this.authAuditLogger.logTokenFailure({
        ...buildTokenRequestContext(request),
        reason: "invalid_token",
      });
      throw new UnauthorizedException();
    }
  }
}
