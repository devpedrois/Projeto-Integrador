import express, { type Express } from "express";
import type { PrismaClient } from "./generated/prisma/client.js";
import { HealthController } from "./controllers/health.controller.js";
import { PedidoController } from "./controllers/pedido.controller.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { PrismaHealthRepository } from "./repositories/health.repository.js";
import { PrismaPedidoRepository } from "./repositories/pedido.repository.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createPedidoRouter } from "./routes/pedido.routes.js";
import { HealthService } from "./services/health.service.js";
import { PedidoService } from "./services/pedido.service.js";

export function createApp(prisma: PrismaClient): Express {
  const healthRepository = new PrismaHealthRepository(prisma);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);

  const pedidoRepository = new PrismaPedidoRepository(prisma);
  const pedidoService = new PedidoService(pedidoRepository);
  const pedidoController = new PedidoController(pedidoService);

  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use(createHealthRouter(healthController));
  app.use(createPedidoRouter(pedidoController));
  app.use(errorMiddleware);

  return app;
}
