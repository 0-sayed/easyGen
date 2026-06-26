import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const moduleUrl = import.meta.url.startsWith("file:")
  ? import.meta.url
  : pathToFileURL(import.meta.url).href;
const repoRoot = fileURLToPath(new URL("../..", moduleUrl));
const DEFAULT_API_PORT = 3000;
const DEFAULT_API_URL = `http://127.0.0.1:${DEFAULT_API_PORT}`;
const DEFAULT_WEB_PORT = 5173;

function parsePort(value: string | undefined, defaultPort: number): number {
  const candidate = value?.trim();

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return defaultPort;
  }

  const parsedPort = Number.parseInt(candidate, 10);

  return parsedPort > 0 && parsedPort <= 65_535 ? parsedPort : defaultPort;
}

function resolveApiUrl(env: Record<string, string>): string | undefined {
  const configuredApiUrl = env.VITE_API_URL?.trim();
  const effectiveApiUrl =
    configuredApiUrl === undefined || configuredApiUrl.length === 0
      ? DEFAULT_API_URL
      : configuredApiUrl;

  if (effectiveApiUrl !== DEFAULT_API_URL) {
    return effectiveApiUrl;
  }

  const apiPort = parsePort(env.PORT, DEFAULT_API_PORT);
  return apiPort === DEFAULT_API_PORT ? configuredApiUrl : `http://127.0.0.1:${apiPort}`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiUrl = resolveApiUrl(env);
  const webPort = parsePort(env.WEB_PORT, DEFAULT_WEB_PORT);

  if (apiUrl !== undefined) {
    process.env.VITE_API_URL = apiUrl;
  }

  return {
    envDir: repoRoot,
    plugins: [tailwindcss(), react()],
    preview: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
    },
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
