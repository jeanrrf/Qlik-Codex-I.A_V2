import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { logger } from "../lib/logger";

interface ExpressError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

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
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn("Erro de validação", { errors: err.errors });
    res.status(400).json({
      error: "Erro de validação",
      details: extractErrorMessage(err),
      issues: err.errors
    });
    return;
  }

  // Handle errors with status code (e.g. from express.json limit or custom errors)
  const expressErr = err as ExpressError;
  const status = expressErr.status || expressErr.statusCode || 500;

  // If it's a client error (4xx), log as warning and return the error message
  if (typeof status === 'number' && status >= 400 && status < 500) {
    logger.warn(`Erro cliente ${status}`, { error: extractErrorMessage(err) });
    res.status(status).json({
      error: extractErrorMessage(err),
      details: expressErr.type || undefined
    });
    return;
  }

  logger.error("Erro interno no servidor", { err });

  res.status(500).json({
    error: "Erro interno no servidor",
    details: extractErrorMessage(err)
  });
};
