import { Router } from "express";
import type { IndicadoresAdminController } from "../controllers/indicadores-admin.controller.js";

export function createIndicadoresAdminRouter(
  controller: IndicadoresAdminController,
) {
  const router = Router();
  router.get("/admin/indicadores", controller.obter);
  return router;
}
