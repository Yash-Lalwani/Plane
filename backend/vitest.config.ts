import { defineConfig } from "vitest/config";
import { testEnv } from "./tests/helpers/test-env.js";

export default defineConfig({
  test: {
    environment: "node",
    env: testEnv,
    globalSetup: ["./tests/global-setup.ts"],
    // All test files share one database, so they must not run at the same time.
    fileParallelism: false,
  },
});
