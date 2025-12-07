import fs from "node:fs";
import path from "node:path";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { config } from "./lib/config";
import { logger } from "./lib/logger";
import { initDb, closeDb } from "./lib/dbAdapter";
import { errorHandler } from "./middleware/errorHandler";
import { healthRouter } from "./routes/health.routes";
import { contactRouter } from "./routes/contact.routes";
import { router as scriptsRouter } from "./routes/scripts.routes";
import { validationRouter } from "./routes/validation.routes";
import { toolsRouter } from "./routes/tools.routes";
import { historyRouter } from "./routes/history.routes";
import sessionRouter from "./routes/session.routes";
import authRouter from "./routes/auth.routes";
import usageRouter from "./routes/usage.routes";
import analyticsRouter from "./routes/analytics.routes";

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
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(config.isDevelopment ? "dev" : "tiny"));

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
app.use("/api/scripts", scriptsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/validate", validationRouter);
app.use("/api/tools", toolsRouter);
app.use("/api/history", historyRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/usage", usageRouter);
app.use("/api/analytics", analyticsRouter);

if (fs.existsSync(webBuildPath)) {
  app.use(express.static(webBuildPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (!fs.existsSync(indexHtmlPath)) {
      logger.warn("index.html do frontend nao encontrado em %s", indexHtmlPath);
      return res.status(404).send("Frontend nao esta compilado.");
    }

    return res.sendFile(indexHtmlPath);
  });
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
      postgresConfigured: Boolean(process.env.DATABASE_URL),
      ownerEmailSet: Boolean(process.env.OWNER_EMAIL),
      viteOwnerEmailSet: Boolean(process.env.VITE_OWNER_EMAIL)
    });

    // Quick validations / hints
    if (config.jwtSecret === 'qlik-codex-ia-secret-change-in-production' && config.nodeEnv === 'production') {
      logger.warn('JWT_SECRET is using the default value in production — set a strong JWT_SECRET in env vars');
    }

    if (!config.googleClientId || !config.googleClientSecret) {
      logger.warn('Google OAuth environment variables missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). OAuth login may fail.');
    }

    await initDb();
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
