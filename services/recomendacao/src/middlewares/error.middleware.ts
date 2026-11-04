import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error.js";

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  void _next;
  if (error instanceof AppError) {
    response
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (
    error instanceof Error &&
    "type" in error &&
    ["entity.parse.failed", "entity.too.large"].includes(String(error.type))
  ) {
    response
      .status(error.type === "entity.too.large" ? 413 : 400)
      .json({ error: { code: "VALIDACAO", message: "JSON invalido." } });
    return;
  }
  response
    .status(503)
    .json({ status: "error", message: "Service unavailable" });
}
