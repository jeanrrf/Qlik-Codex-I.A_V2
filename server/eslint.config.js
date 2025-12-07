import path from "node:path";
import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

const tsconfigPath = path.resolve("./tsconfig.json");

export default [
  {
    ignores: ["dist/**", "node_modules/**", "src/**/*.d.ts"]
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir: path.resolve("."),
        sourceType: "module"
      },
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".ts"]
        }
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroupsExcludedImportTypes: ["builtin"]
        }
      ],
      "import/no-unresolved": "error",
      // Temporarily relax require-await until async handlers are refactored
      "@typescript-eslint/require-await": "off"
    }
  }
];
