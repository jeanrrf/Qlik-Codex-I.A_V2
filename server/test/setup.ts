/**
 * Vitest Global Setup
 * Carrega variáveis de ambiente ANTES de qualquer teste
 */
import dotenv from "dotenv";

// Carrega .env da raiz do server/
dotenv.config();

console.log("[Vitest Setup] Environment loaded:", {
  hasTursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
  hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
  hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY)
});
