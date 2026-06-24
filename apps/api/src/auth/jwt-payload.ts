export interface JwtPayload {
  email: string;
  exp?: number;
  iat?: number;
  jti: string;
  sub: string;
}
