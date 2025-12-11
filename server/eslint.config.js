const path = require("node:path");
const js = require("@eslint/js");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const importPlugin = require("eslint-plugin-import");

const tsconfigPath = path.resolve("./tsconfig.json");

module.exports = [
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
        },
        typescript: {
          alwaysTryTypes: true,
          project: tsconfigPath
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
      "import/no-unresolved": ["error", { ignore: ['\\.js$'] }],
      // Temporarily relax require-await until async handlers are refactored
      "@typescript-eslint/require-await": "off"
    }
  }
];
