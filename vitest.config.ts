import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/tests/setup.ts"],
    fileParallelism: false,
    hookTimeout: 600_000,
    testTimeout: 30_000,
  },
});
