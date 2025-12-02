import type { ErrorRequestHandler } from "express";

import { logger } from "../lib/logger";

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
  }

  return "Erro desconhecido";
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error("Erro interno no servidor", { err });

  res.status(500).json({
    error: "Erro interno no servidor",
    details: extractErrorMessage(err)
  });
};
