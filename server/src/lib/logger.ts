type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

// Default mais silencioso: WARN. Para ver info/debug, defina LOG_LEVEL=info ou LOG_LEVEL=debug.
const envLevel = (process.env.LOG_LEVEL || "warn").toLowerCase() as LogLevel;
const CURRENT_LEVEL: LogLevel = envLevel in LEVEL_PRIORITY ? envLevel : "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[CURRENT_LEVEL];
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;

  const prefix = `[qlik-codex-ia:${level}]`;
  if (meta !== undefined) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta)
};
