import type { NextFunction, Request, Response } from "express";
import type { HealthService } from "../services/health.service.js";

export class HealthController {
  public constructor(
    private readonly service: HealthService,
    private readonly cookieSecure = false,
  ) {}

  public probeCookie = (_request: Request, response: Response): void => {
    response.set("Cache-Control", "no-store");
    response.cookie("origem_cookie_probe", "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: this.cookieSecure,
      path: "/",
      maxAge: 5 * 60 * 1_000,
    });
    response.status(200).json({ status: "ok", cookie: "origem_cookie_probe" });
  };

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
