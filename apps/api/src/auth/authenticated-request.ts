import type { Request } from "express";

import type { JwtPayload } from "./jwt-payload";

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
