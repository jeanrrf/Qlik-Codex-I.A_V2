import fs from "node:fs";
import path from "node:path";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./lib/config";
import { initDb, closeDb } from "./lib/dbAdapter";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { analyticsRouter } from "./routes/analytics.routes";
import authRouter from "./routes/auth.routes";
import contactRouter from "./routes/contact.routes";
import { healthRouter } from "./routes/health.routes";
import { metricsRouter } from "./routes/metrics.routes";
import ragRouter from "./routes/rag.routes";
import { router as scriptsRouter } from "./routes/scripts.routes";
import sessionRouter from "./routes/session.routes";
import { toolsRouter } from "./routes/tools.routes";
import usageRouter from "./routes/usage.routes";
import { validationRouter } from "./routes/validation.routes";
import { vectorRAGService } from "./services/vectorRAGService";

const app = express();

// Trust proxy (Render/Vercel)
app.set("trust proxy", 1);

const corsOptions =
  config.corsAllowAll
    ? {
      origin: true as const, // reflect request origin
      credentials: true as const
    }
    : {
      origin: config.corsOrigins,
      credentials: true as const
    };
const webBuildPath = path.resolve(__dirname, "..", "..", "web", "dist");
const indexHtmlPath = path.join(webBuildPath, "index.html");

app.disable("x-powered-by");

// Security Hardening
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for now (adjust for stricter security)
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://api.anthropic.com"], // Allow external APIs
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Rate Limiting - Basic DDoS protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);
app.use(cors(corsOptions));

// Compressão Gzip (gratuita) - reduz tamanho das respostas em 60-80%
app.use(
  compression({
    filter: (req: Request, res: Response) => {
      // Não comprimir se já estiver comprimido ou for imagem/vídeo
      if (req.headers['x-no-compression']) {
        return false;
      }
      const contentType = res.getHeader('Content-Type')?.toString() || '';
      if (
        contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/')
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Só comprime respostas > 1KB
    level: 6 // Nível de compressão balanceado (1-9, 6 é o padrão)
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const requestLogger = morgan(config.isDevelopment ? "dev" : "tiny", {
  skip: (req: express.Request) =>
    req.path.startsWith("/api/analytics/summary") ||
    req.path.startsWith("/health") ||
    req.path === "/",
});
app.use(requestLogger);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "QLIK CODEX I.A - AINEX",
    version: "0.2.1",
    status: "online",
    endpoints: {
      health: "/health",
      api: {
        scripts: "/api/scripts",
        contact: "/api/contact",
        validate: "/api/validate",
        tools: "/api/tools",
        history: "/api/history"
      }
    },
    documentation: "https://github.com/jeanrrf/Qlik-Codex-I.A-pro"
  });
});

app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/contact", contactRouter);
app.use("/api/scripts", scriptsRouter);
app.use("/api/validate", validationRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/usage", usageRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/rag", ragRouter);

if (config.serveStaticFrontend && fs.existsSync(webBuildPath)) {
  logger.info(`Serving static frontend from: ${webBuildPath}`);

  // Debug middleware for assets
  app.use((req, res, next) => {
    if (req.path.startsWith('/assets')) {
      logger.info(`[Static] Request for asset: ${req.path}`);
    }
    next();
  });

  // Cache de assets estáticos (gratuito) - melhora performance
  app.use(
    express.static(webBuildPath, {
      maxAge: config.isDevelopment ? 0 : '1y', // Cache de 1 ano em produção
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Cache agressivo para assets com hash no nome
        if (path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Avoid serving index.html for missing assets to prevent MIME type mismatch errors
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$/)) {
      return res.status(404).send("Asset not found");
    }

    if (!fs.existsSync(indexHtmlPath)) {
      logger.warn("index.html do frontend nao encontrado em %s", indexHtmlPath);
      return res.status(404).send("Frontend nao esta compilado.");
    }

    return res.sendFile(indexHtmlPath);
  });
} else if (!config.serveStaticFrontend) {
  logger.info("Servidor configurado para NAO servir o frontend estatico (SERVE_STATIC_FRONTEND=false). Use o frontend hospedado externamente em %s", config.frontendUrl);
} else {
  logger.warn("Build do frontend nao encontrado em %s. Execute `npm run build` dentro de web/", webBuildPath);
}

app.use(errorHandler);

async function startServer() {
  try {
    // Startup summary (non-sensitive flags only)
    logger.info('Startup configuration', {
      nodeEnv: config.nodeEnv,
      tursoConfigured: Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN),
      ownerEmailSet: Boolean(process.env.OWNER_EMAIL),
      viteOwnerEmailSet: Boolean(process.env.VITE_OWNER_EMAIL)
    });

    const maskedNvidiaKey = config.nvidiaApiKey
      ? `${config.nvidiaApiKey.slice(0, 6)}***${config.nvidiaApiKey.slice(-4)}`
      : null;

    logger.info('NVIDIA model configuration', {
      chatModel: config.nvidiaModel,
      embeddingModel: config.nvidiaEmbeddingModel,
      ragEmbeddingModel: config.rag.embeddingModel,
      ragEmbeddingProvider: config.rag.embeddingProvider,
      apiKeyMasked: maskedNvidiaKey,
      apiKeySource: config.nvidiaApiKeySource,
      dotenvOverride: config.dotenvOverride
    });

    // Quick validations / hints
    if (config.jwtSecret === 'qlik-codex-ia-secret-change-in-production' && config.nodeEnv === 'production') {
      logger.warn('JWT_SECRET is using the default value in production — set a strong JWT_SECRET in env vars');
    }

    if (!config.googleClientId || !config.googleClientSecret) {
      logger.warn('Google OAuth environment variables missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). OAuth login may fail.');
    }

    logger.info('Initializing database connection...');
    await initDb();
    logger.info('Database initialization completed successfully');

    // Initialize RAG system if enabled
    if (config.rag.enabled) {
      logger.info('Initializing RAG vector store...');
      try {
        await vectorRAGService.initialize();
        logger.info('RAG vector store initialized successfully');
      } catch (ragErr) {
        logger.error('Failed to initialize RAG system (non-fatal, will continue without RAG)', ragErr);
      }
    } else {
      logger.info('RAG system is disabled (RAG_ENABLED=false)');
    }
  } catch (err) {
    logger.error("Failed to initialize database", err);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info("Qlik Codex I.A server rodando", {
      port: config.port,
      env: config.nodeEnv,
    });
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received, closing database connections...`);
    try {
      await closeDb();
      logger.info("Database connections closed.");
    } catch (err) {
      logger.error("Error during database connection closing", err);
    } finally {
      server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
      });
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

startServer();
