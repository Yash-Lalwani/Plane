import { execSync } from "node:child_process";
import { testEnv } from "./helpers/test-env.js";

// Runs once before all test files: bring the test database schema up to date.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, ...testEnv },
    stdio: "inherit",
  });
}
