declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL_NAME?: string;
    GEMINI_FALLBACK_MODEL_NAME?: string;
    NVIDIA_API_KEY?: string;
    NVIDIA_CHAT_MODEL?: string;
    NVIDIA_EMBEDDING_MODEL?: string;
    LLM_PROVIDERS?: string;
    // Database: usando Turso (TURSO_DATABASE_URL e TURSO_AUTH_TOKEN)
    NODE_ENV?: "development" | "production" | "test";
  }
}
