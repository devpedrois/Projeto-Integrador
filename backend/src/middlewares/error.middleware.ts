import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(
  _error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  void _next;
  response.status(503).json({
    status: "error",
    message: "Service unavailable",
  });
}
