import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "src/generated"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Express error handlers must declare all four arguments, even unused ones.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
);
