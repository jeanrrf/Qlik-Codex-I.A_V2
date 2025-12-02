import dotenv from "dotenv";

dotenv.config();

const APP_VERSION = "0.1.0";
const rawPort = Number(process.env.PORT ?? "3000");
const llmProvidersEnv = (process.env.LLM_PROVIDERS ?? "google")
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter((provider) => provider.length > 0);
const llmProviders = llmProvidersEnv.length > 0 ? llmProvidersEnv : ["google"];

export const config = {
  nodeEnv: (process.env.NODE_ENV || "development") as
    | "development"
    | "production"
    | "test",
  isDevelopment: process.env.NODE_ENV !== "production",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  port: Number.isNaN(rawPort) ? 3000 : rawPort,
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  nvidiaApiKey: process.env.NVIDIA_API_KEY || "",
  nvidiaModel: process.env.NVIDIA_MODEL_NAME || "nvidia/llama-3.3-nemotron-super-49b-v1.5",
  llmProviders,
  databaseUrl: process.env.DATABASE_URL || "",
  version: APP_VERSION,

  // Google OAuth Configuration
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || "qlik-codex-ia-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15d",

  // Owner Access (bypass OAuth)
  ownerAccessToken: process.env.OWNER_ACCESS_TOKEN || "",
  ownerEmail: process.env.OWNER_EMAIL || "owner@qlikcodex.local",

  // Frontend URL (para redirects)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

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

  // Script analysis and chunking thresholds (PERFORMANCE OPTIMIZATION)
  scriptAnalysis: {
    // Quando aplicar chunking
    chunkingThresholds: {
      qvdQvsLineThreshold: 800,      // QVD/QVS com +800 linhas → chunk
      qvdQvsTokenThreshold: 40000,   // QVD/QVS com +40k tokens → chunk
      anyFileLineThreshold: 1500,    // Qualquer arquivo +1500 linhas → chunk
      anyFileTokenThreshold: 80000   // Qualquer arquivo +80k tokens → chunk
    },

    // Tamanhos de chunk por complexidade
    chunkSizes: {
      low: 400,       // Complexidade baixa = chunks maiores
      medium: 300,
      high: 200,
      critical: 150   // Complexidade crítica = chunks menores e mais precisos
    },

    // Overlap entre chunks (preserva contexto)
    overlapPercentage: 15,  // 15% de overlap entre chunks consecutivos

    // Timeouts ajustados por estratégia
    timeouts: {
      full: 180000,      // 180s para análise completa (padrão)
      optimized: 120000, // 120s para análise otimizada
      chunked: 90000     // 90s por chunk (processamento paralelo futuramente)
    }
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
