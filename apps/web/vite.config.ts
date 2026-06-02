import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const DEFAULT_WEB_PORT = 5173;

function parseWebPort(value: string | undefined): number {
  const candidate = value?.trim();

  if (candidate === undefined || !/^\d+$/.test(candidate)) {
    return DEFAULT_WEB_PORT;
  }

  const parsedPort = Number.parseInt(candidate, 10);

  return parsedPort > 0 && parsedPort <= 65_535 ? parsedPort : DEFAULT_WEB_PORT;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const webPort = parseWebPort(env.WEB_PORT);

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
