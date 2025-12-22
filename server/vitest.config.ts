import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.{test,spec}.ts"],
    globals: false,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks", // Isolamento melhor para testes de banco
    poolOptions: {
      forks: {
        singleFork: true // Evita race conditions no DB
      }
    }
  }
});
