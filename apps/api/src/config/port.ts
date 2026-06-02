export function resolvePort(
  configuredPort: string | undefined,
  defaultPort: number,
  variableName: string
): number {
  if (configuredPort === undefined) {
    return defaultPort;
  }

  const candidate = configuredPort.trim();

  if (!/^\d+$/.test(candidate)) {
    throw new Error(`${variableName} must be a positive integer between 1 and 65535.`);
  }

  const port = Number.parseInt(candidate, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variableName} must be a positive integer between 1 and 65535.`);
  }

  return port;
}
