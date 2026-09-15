import express, { type Express } from "express";
import type { PrismaClient } from "./generated/prisma/client.js";
import { HealthController } from "./controllers/health.controller.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { PrismaHealthRepository } from "./repositories/health.repository.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { HealthService } from "./services/health.service.js";

export function createApp(prisma: PrismaClient): Express {
  const repository = new PrismaHealthRepository(prisma);
  const service = new HealthService(repository);
  const controller = new HealthController(service);
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use(createHealthRouter(controller));
  app.use(errorMiddleware);

  return app;
}
