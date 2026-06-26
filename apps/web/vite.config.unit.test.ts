import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { loadEnv, type ConfigEnv } from "vite";

vi.mock("vite", async () => {
  const actual = await vi.importActual<typeof import("vite")>("vite");

  return {
    ...actual,
    loadEnv: vi.fn(),
  };
});

const loadEnvMock = loadEnv as Mock<typeof loadEnv>;

describe("vite config", () => {
  beforeEach(() => {
    loadEnvMock.mockReset();
    delete process.env.PORT;
    delete process.env.VITE_API_URL;
  });

  it("derives VITE_API_URL from loaded PORT when VITE_API_URL is blank", async () => {
    loadEnvMock.mockReturnValue({
      PORT: "3101",
      VITE_API_URL: "   ",
      WEB_PORT: "5173",
    });

    await evaluateConfig();

    expect(process.env.VITE_API_URL).toBe("http://127.0.0.1:3101");
  });

  it("derives VITE_API_URL from loaded PORT when VITE_API_URL is missing", async () => {
    loadEnvMock.mockReturnValue({
      PORT: "3102",
      WEB_PORT: "5173",
    });

    await evaluateConfig();

    expect(process.env.VITE_API_URL).toBe("http://127.0.0.1:3102");
  });

  it("keeps an explicitly configured VITE_API_URL", async () => {
    loadEnvMock.mockReturnValue({
      PORT: "3101",
      VITE_API_URL: "  http://127.0.0.1:3999  ",
      WEB_PORT: "5173",
    });

    await evaluateConfig();

    expect(process.env.VITE_API_URL).toBe("http://127.0.0.1:3999");
  });
});

async function evaluateConfig() {
  const { default: viteConfig } = await import("./vite.config");

  if (typeof viteConfig !== "function") {
    throw new Error("Expected Vite config to export a function.");
  }

  viteConfig({
    command: "serve",
    mode: "test",
    isPreview: false,
    isSsrBuild: false,
  } satisfies ConfigEnv);
}
