declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    GEMINI_API_KEY?: string;
    // Database: usando Turso (TURSO_DATABASE_URL e TURSO_AUTH_TOKEN)
    NODE_ENV?: "development" | "production" | "test";
  }
}
