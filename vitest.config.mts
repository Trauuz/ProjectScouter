import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    exclude: ["e2e/**", "tests/integration/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "app/api/**/*handler.ts",
        "features/auth/**/*.ts",
        "features/research/prompt-history/**/*.ts",
        "server/auth/**/*.ts",
        "server/observability/**/*.ts",
        "server/research/application/**/*.ts",
        "server/research/presentation/**/*.ts",
        "server/security/**/*.ts",
        "server/usage/**/*.ts",
        "shared/layout/usage-dialog-state.ts",
      ],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/composition-root.ts"],
      thresholds: {
        lines: 50,
        functions: 45,
        branches: 40,
        statements: 50,
      },
    },
  },
});
