import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/tests/setup.js"],
    testTimeout: 10000,
    fileParallelism: false,
  },
});
