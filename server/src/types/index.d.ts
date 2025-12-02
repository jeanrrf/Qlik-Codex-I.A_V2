declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    GEMINI_API_KEY?: string;
    DATABASE_URL?: string;
    NODE_ENV?: "development" | "production" | "test";
  }
}
