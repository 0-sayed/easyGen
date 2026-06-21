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
import type { JwtPayload } from "./jwt-payload";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    private readonly authAuditLogger: AuthAuditLogger
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

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      this.authAuditLogger.logTokenFailure({
        ...buildTokenRequestContext(request),
        reason: "invalid_token",
      });
      throw new UnauthorizedException();
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token, extra] = request.headers.authorization?.trim().split(/\s+/) ?? [];

    if (extra !== undefined) {
      return undefined;
    }

    return type?.toLowerCase() === "bearer" ? token : undefined;
  }
}
