import { mongo } from "mongoose";

const DEFAULT_JWT_EXPIRES_IN = "15m";
const DEFAULT_LOG_LEVEL = "info";
const DEFAULT_MONGODB_HOST = "127.0.0.1";
const DEFAULT_MONGODB_PORT = "27018";
const DEFAULT_PORT = "3000";
const DEFAULT_WEB_PORT = "5173";

const ALLOWED_LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"] as const;

type LogLevel = (typeof ALLOWED_LOG_LEVELS)[number];

export type ValidatedAppConfig = Record<string, unknown> & {
  JWT_EXPIRES_IN: string;
  JWT_SECRET: string;
  LOG_LEVEL: LogLevel;
  MONGODB_PORT: string;
  MONGODB_URI: string;
  PORT: string;
  WEB_PORT: string;
};

export function buildLocalMongodbUri(mongodbPort: string): string {
  return `mongodb://${DEFAULT_MONGODB_HOST}:${mongodbPort}/easygen?directConnection=true`;
}

export function validateAppConfig(config: Record<string, unknown>): ValidatedAppConfig {
  const port = parsePort(readOptionalString(config.PORT) ?? DEFAULT_PORT, "PORT");
  const webPort = parsePort(readOptionalString(config.WEB_PORT) ?? DEFAULT_WEB_PORT, "WEB_PORT");
  const mongodbPort = parsePort(
    readOptionalString(config.MONGODB_PORT) ?? DEFAULT_MONGODB_PORT,
    "MONGODB_PORT"
  );
  const jwtSecret = readRequiredString(config.JWT_SECRET, "JWT_SECRET");
  const jwtExpiresIn = parseJwtExpiresIn(
    readOptionalString(config.JWT_EXPIRES_IN) ?? DEFAULT_JWT_EXPIRES_IN
  );
  const logLevel = parseLogLevel(readOptionalString(config.LOG_LEVEL) ?? DEFAULT_LOG_LEVEL);
  const mongodbUri = parseMongodbUri(
    readOptionalString(config.MONGODB_URI) ?? buildLocalMongodbUri(mongodbPort)
  );

  return {
    ...config,
    JWT_EXPIRES_IN: jwtExpiresIn,
    JWT_SECRET: jwtSecret,
    LOG_LEVEL: logLevel,
    MONGODB_PORT: mongodbPort,
    MONGODB_URI: mongodbUri,
    PORT: port,
    WEB_PORT: webPort,
  };
}

function readOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return value.toString().trim();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "bigint") {
    return value.toString().trim();
  }

  return undefined;
}

function readRequiredString(value: unknown, variableName: string): string {
  const candidate = readOptionalString(value);

  if (candidate === undefined || candidate.length === 0) {
    throw new Error(`${variableName} is required.`);
  }

  return candidate;
}

function parsePort(value: string, variableName: string): string {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${variableName} must be a positive integer between 1 and 65535.`);
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variableName} must be a positive integer between 1 and 65535.`);
  }

  return String(port);
}

function parseJwtExpiresIn(value: string): string {
  if (!/^[1-9]\d*(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error("JWT_EXPIRES_IN must be a duration such as 15m, 1h, or 7d.");
  }

  return value;
}

function parseLogLevel(value: string): LogLevel {
  if (!ALLOWED_LOG_LEVELS.includes(value as LogLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${ALLOWED_LOG_LEVELS.join(", ")}.`);
  }

  return value as LogLevel;
}

function parseMongodbUri(value: string): string {
  if (!value.startsWith("mongodb://") && !value.startsWith("mongodb+srv://")) {
    throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://.");
  }

  try {
    new mongo.MongoClient(value);
  } catch {
    throw new Error("MONGODB_URI must be a valid MongoDB connection string.");
  }

  return value;
}
