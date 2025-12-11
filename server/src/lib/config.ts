import dotenv from "dotenv";

dotenv.config();

const APP_VERSION = "0.1.0";
const rawPort = Number(process.env.PORT ?? "3000");

const nodeEnv = (process.env.NODE_ENV || "development") as
  | "development"
  | "production"
  | "test";
const isDevelopment = nodeEnv !== "production";

const llmProvidersEnv = (process.env.LLM_PROVIDERS ?? "google")
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter((provider) => provider.length > 0);
const llmProviders = llmProvidersEnv.length > 0 ? llmProvidersEnv : ["google"];

const MAX_BROWSER_AUTH_DAYS = 400;
const rawAuthSessionDurationDays = Number(
  process.env.AUTH_SESSION_DURATION_DAYS ?? `${MAX_BROWSER_AUTH_DAYS}`
);
const safeAuthSessionDurationDays = Number.isFinite(rawAuthSessionDurationDays)
  ? rawAuthSessionDurationDays
  : MAX_BROWSER_AUTH_DAYS;
const effectiveAuthDurationDays = Math.min(safeAuthSessionDurationDays, MAX_BROWSER_AUTH_DAYS);

// CORS
const normalizeOrigin = (origin: string) => {
  const trimmed = origin.trim();
  if (!trimmed || trimmed === "*") return trimmed;

  try {
    // Remove path/query/fragment to avoid mismatches (keep only scheme + host + port)
    return new URL(trimmed).origin;
  } catch {
    // Fallback: strip trailing slashes if the URL constructor fails (e.g. custom schemes)
    return trimmed.replace(/\/+$/, "");
  }
};

const rawCorsEnv = process.env.CORS_ORIGIN?.trim() ?? "";
const frontendOrigin = normalizeOrigin(process.env.FRONTEND_URL ?? "");
const vercelOrigin = normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
const serveStaticFrontend =
  process.env.SERVE_STATIC_FRONTEND
    ? process.env.SERVE_STATIC_FRONTEND.toLowerCase() !== "false"
    : true;

// Keep "*" only when explicitly set
const allowAllCors = rawCorsEnv === "*";

const parsedCorsOrigins = Array.from(
  new Set(
    [
      ...(allowAllCors
        ? []
        : (rawCorsEnv ? rawCorsEnv.split(",").map((origin) => normalizeOrigin(origin)) : [])),
      frontendOrigin,
      vercelOrigin,
      ...(isDevelopment ? ["http://localhost:5173", "http://localhost:3000"] : [])
    ]
      .map((origin) => origin?.trim())
      .filter((origin): origin is string => Boolean(origin) && origin !== "*")
  )
);

export const config = {
  nodeEnv,
  isDevelopment,
  corsOrigin: rawCorsEnv || frontendOrigin || "",
  corsAllowAll: allowAllCors,
  corsOrigins: parsedCorsOrigins,
  serveStaticFrontend,
  port: Number.isNaN(rawPort) ? 3000 : rawPort,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL_NAME || "gemini-2.5-flash",
  // Fallback para Gemini (agora 2.5 Flash-Light / 2.0 Flash-Lite)
  geminiFallbackModel: process.env.GEMINI_FALLBACK_MODEL_NAME || "gemini-2.0-flash-lite-preview-02-05",
  nvidiaApiKey: process.env.NVIDIA_API_KEY || "",
  // Default NVIDIA model used for optimizations. Switched to DeepSeek R1 per request.
  nvidiaModel: process.env.NVIDIA_MODEL_NAME || "deepseek-ai/deepseek-r1",
  // Fallback NVIDIA (modelo ~500B, agora Qwen 3 Coder 480B na NIM)
  nvidiaFallbackModel: process.env.NVIDIA_FALLBACK_MODEL_NAME || "qwen/qwen3-coder-480b-a35b-instruct",
  // Tertiary Fallback (Mistral)
  nvidiaTertiaryModel: process.env.NVIDIA_TERTIARY_MODEL_NAME || "mistralai/devstral-2-123b-instruct-2512",
  // Modo rápido NVIDIA (modelo >100B por padrão; ajuste via env para variantes mais leves/rápidas)
  // Por padrão usamos o mesmo modelo deepseek-r1 para otimizações rápidas também — pode ser customizado via env
  nvidiaFastModel: process.env.NVIDIA_FAST_MODEL_NAME || "deepseek-ai/deepseek-r1",
  llmProviders,
  databaseUrl: process.env.DATABASE_URL || "",
  version: APP_VERSION,

  // Google OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",

  // JWT Configuration (padrão: tokens longos para não expirar na prática, respeitando limites de navegador)
  jwtSecret: process.env.JWT_SECRET || "qlik-codex-ia-secret-change-in-production",

  // Auth session configuration (long-lived por padrão, porém limitada ao máximo que navegadores persistem cookies ~400 dias)
  authSessionDurationDays: safeAuthSessionDurationDays,

  // Duração efetiva respeitando limites de persistência de cookies dos navegadores (Chrome/Firefox ~400 dias)
  effectiveAuthDurationDays,

  // Expiração padrão do JWT alinhada à duração efetiva (em dias)
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || `${effectiveAuthDurationDays}d`,

  // Owner Access (bypass OAuth)
  ownerAccessToken: process.env.OWNER_ACCESS_TOKEN || "",
  ownerEmail: process.env.OWNER_EMAIL || "owner@qlikcodex.local",

  // Frontend URL (para redirects)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // Analytics runtime toggle
  // Use ANALYTICS_ENABLED=true in env to explicitly enable analytics
  analyticsEnabled: (process.env.ANALYTICS_ENABLED || 'false').toLowerCase() === 'true',

  // Optimization thresholds for LLM prompts
  optimizationThresholds: {
    highComplexityLOC: 500,
    highComplexityCC: 15,
    lowMaintainabilityIndex: 50,
    targetMaintainabilityIndex: 65,
    targetComplexityCC: 10,
    lowCommentRatio: 5, // percentage
    highUnusedVariables: 10,
    highDuplicateBlocks: 3
  },

  // Business metrics for ROI calculation (REVENUE FEATURE)
  businessMetrics: {
    // Cloud infrastructure costs (R$/month)
    cloudRAMCostPerGBMonth: 160,        // AWS/Azure médio
    cloudCPUCostPerCoreMonth: 80,       // Compute otimizado
    cloudStorageCostPerGBMonth: 0.30,   // S3/Blob storage

    // Human resources costs
    developerHourlyRate: 150,           // R$/hora dev Qlik pleno/sênior
    analystHourlyRate: 80,              // R$/hora analista de negócio

    // Performance impact estimators
    reloadTimeValuePerMinute: 5,        // R$ valor por minuto de reload economizado
    complexityReductionHoursPerCC: 0.8, // horas dev economizadas por ponto de CC reduzido
    locReductionMaintenanceHoursPer100: 2, // horas de manutenção economizadas por 100 LOC removidas
    ramReductionPercentPerLoadStar: 15, // % RAM economizado ao eliminar LOAD *

    // Business multipliers
    monthlyReloadsAverage: 120,         // reloads/mês (4x/dia)
    developersOnTeam: 3,                // desenvolvedores Qlik na equipe
    averageIncidentCostPerHour: 500     // R$/hora de incidente em produção
  }
};
