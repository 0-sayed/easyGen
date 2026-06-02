import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts"],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.unit.test.ts"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.integration.test.ts"],
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 60_000,
        },
      },
      {
        test: {
          name: "e2e",
          environment: "node",
          include: ["src/**/*.e2e.test.ts"],
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
