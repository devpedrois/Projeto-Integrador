import { Router } from "express";
import type { HealthController } from "../controllers/health.controller.js";

export function createHealthRouter(
  controller: HealthController,
  enableCookieProbe = false,
): Router {
  const router = Router();
  router.get("/health", controller.check);
  if (enableCookieProbe) {
    router.get("/health/cookie", controller.probeCookie);
  }
  return router;
}
