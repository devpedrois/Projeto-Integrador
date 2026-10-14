import type { NextFunction, Request, Response } from "express";
import type { HealthService } from "../services/health.service.js";

export class HealthController {
  public constructor(private readonly service: HealthService) {}

  public check = async (
    _request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      response.status(200).json(await this.service.check());
    } catch (error: unknown) {
      next(error);
    }
  };
}
