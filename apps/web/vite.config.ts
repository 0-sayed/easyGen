import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const DEFAULT_WEB_PORT = 5173;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const webPort = Number.parseInt(env.WEB_PORT ?? `${DEFAULT_WEB_PORT}`, 10);

  return {
    envDir: repoRoot,
    plugins: [react()],
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
  };
});
