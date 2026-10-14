import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { PrismaClient } from "./generated/prisma/client.js";
import type { Environment } from "./config/environment.js";
import { AuthController } from "./controllers/auth.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { PedidoController } from "./controllers/pedido.controller.js";
import { RecomendacaoController } from "./controllers/recomendacao.controller.js";
import { UsuarioController } from "./controllers/usuario.controller.js";
import { CategoriaRecomendacaoStrategy } from "./integrations/recommendation/categoria-recomendacao.strategy.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { autenticar } from "./middlewares/auth.middleware.js";
import { PrismaHealthRepository } from "./repositories/health.repository.js";
import { PrismaUsuarioRepository } from "./repositories/usuario.repository.js";
import { PrismaPedidoRepository } from "./repositories/pedido.repository.js";
import { PrismaRecomendacaoRepository } from "./repositories/recomendacao.repository.js";
import { createHealthRouter } from "./routes/health.routes.js";
import { createAuthRouter } from "./routes/auth.routes.js";
import { createPedidoRouter } from "./routes/pedido.routes.js";
import { createRecomendacaoRouter } from "./routes/recomendacao.routes.js";
import { createUsuarioRouter } from "./routes/usuario.routes.js";
import { HealthService } from "./services/health.service.js";
import { AuthService } from "./services/auth.service.js";
import { PedidoService } from "./services/pedido.service.js";
import { RecomendacaoService } from "./services/recomendacao.service.js";
import { UsuarioService } from "./services/usuario.service.js";
import { CatalogoController } from "./controllers/catalogo.controller.js";
import { PrismaCatalogoRepository } from "./repositories/catalogo.repository.js";
import { CatalogoService } from "./services/catalogo.service.js";
import { createCatalogoRouter } from "./routes/catalogo.routes.js";
import { PerfilArtesaoController } from "./controllers/perfil-artesao.controller.js";
import { PrismaPerfilArtesaoRepository } from "./repositories/perfil-artesao.repository.js";
import { PerfilArtesaoService } from "./services/perfil-artesao.service.js";
import { createPerfilArtesaoRouter } from "./routes/perfil-artesao.routes.js";

export function createApp(
  prisma: PrismaClient,
  environment: Pick<Environment, "JWT_SECRET" | "COOKIE_SECURE"> = {
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECURE: false,
  },
): Express {
  const healthRepository = new PrismaHealthRepository(prisma);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);
  const usuarioRepository = new PrismaUsuarioRepository(prisma);
  const authService = new AuthService(usuarioRepository);
  const authController = new AuthController(authService, environment);
  const autenticarUsuario = autenticar(authService, environment.JWT_SECRET);
  const usuarioController = new UsuarioController(
    new UsuarioService(usuarioRepository),
  );

  const pedidoRepository = new PrismaPedidoRepository(prisma);
  const pedidoService = new PedidoService(pedidoRepository);
  const pedidoController = new PedidoController(pedidoService);

  const recomendacaoRepository = new PrismaRecomendacaoRepository(prisma);
  const recomendacaoStrategy = new CategoriaRecomendacaoStrategy(
    recomendacaoRepository,
  );
  const catalogoRepository = new PrismaCatalogoRepository(prisma);
  const recomendacaoService = new RecomendacaoService(
    recomendacaoStrategy,
    catalogoRepository,
  );
  const recomendacaoController = new RecomendacaoController(
    recomendacaoService,
  );

  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use(createHealthRouter(healthController));
  app.use(createAuthRouter(authController));
  app.use(createPedidoRouter(pedidoController, autenticarUsuario));
  app.use(createUsuarioRouter(usuarioController, autenticarUsuario));
  app.use(
    createPerfilArtesaoRouter(
      new PerfilArtesaoController(
        new PerfilArtesaoService(new PrismaPerfilArtesaoRepository(prisma)),
      ),
      autenticarUsuario,
    ),
  );
  app.use(createRecomendacaoRouter(recomendacaoController));
  app.use(
    createCatalogoRouter(
      new CatalogoController(new CatalogoService(catalogoRepository)),
    ),
  );
  app.use(errorMiddleware);

  return app;
}
