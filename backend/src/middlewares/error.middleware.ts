import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  void _next;

  if (
    error instanceof Error &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({
      error: { code: "VALIDACAO", message: "JSON invalido." },
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  response.status(503).json({
    status: "error",
    message: "Service unavailable",
  });
}
