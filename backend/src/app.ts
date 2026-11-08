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
import { HttpRecomendacaoClient } from "./integrations/recommendation/http-recomendacao.client.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { requestLogging } from "./middlewares/request-logging.middleware.js";
import { autenticar } from "./middlewares/auth.middleware.js";
import { PrismaHealthRepository } from "./repositories/health.repository.js";
import { PrismaUsuarioRepository } from "./repositories/usuario.repository.js";
import { PrismaPedidoRepository } from "./repositories/pedido.repository.js";
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
import { CarrinhoController } from "./controllers/carrinho.controller.js";
import { PrismaCarrinhoRepository } from "./repositories/carrinho.repository.js";
import { CarrinhoService } from "./services/carrinho.service.js";
import { createCarrinhoRouter } from "./routes/carrinho.routes.js";
import { exigirPapel } from "./middlewares/role.middleware.js";
import { GestaoProdutosController } from "./controllers/gestao-produtos.controller.js";
import { GestaoProdutosService } from "./services/gestao-produtos.service.js";
import { PrismaGestaoProdutosRepository } from "./repositories/gestao-produtos.repository.js";
import { createGestaoProdutosRouter } from "./routes/gestao-produtos.routes.js";
import {
  CachePublico,
  MemoryCacheStore,
  type CacheStore,
} from "./utils/cache.js";
import { CacheHttp, type LogCache } from "./utils/cache-http.js";
import { NotificacaoController } from "./controllers/notificacao.controller.js";
import { PrismaNotificacaoRepository } from "./repositories/notificacao.repository.js";
import { NotificacaoService } from "./services/notificacao.service.js";
import { createNotificacaoRouter } from "./routes/notificacao.routes.js";
import { createDocsRouter } from "./routes/docs.routes.js";
import { IndicadoresController } from "./controllers/indicadores.controller.js";
import { PrismaIndicadoresRepository } from "./repositories/indicadores.repository.js";
import { IndicadoresService } from "./services/indicadores.service.js";
import { createIndicadoresRouter } from "./routes/indicadores.routes.js";
import { IndicadoresAdminController } from "./controllers/indicadores-admin.controller.js";
import { PrismaIndicadoresPlataformaRepository } from "./repositories/indicadores-plataforma.repository.js";
import { IndicadoresAdminService } from "./services/indicadores-admin.service.js";
import { createIndicadoresAdminRouter } from "./routes/indicadores-admin.routes.js";
import { AvaliacaoController } from "./controllers/avaliacao.controller.js";
import { AvaliacaoService } from "./services/avaliacao.service.js";
import { PrismaAvaliacaoRepository } from "./repositories/avaliacao.repository.js";
import { createAvaliacaoRouter } from "./routes/avaliacao.routes.js";
import type { FotoStorage } from "./integrations/storage/foto-storage.js";
import { VercelFotoStorage } from "./integrations/storage/vercel-foto-storage.js";
import { FotoPerfilService } from "./services/foto-perfil.service.js";
import { FotoPerfilController } from "./controllers/foto-perfil.controller.js";
import { createFotoPerfilRouter } from "./routes/foto-perfil.routes.js";

export function createApp(
  prisma: PrismaClient,
  environment: Pick<Environment, "JWT_SECRET" | "COOKIE_SECURE"> &
    Partial<
      Pick<
        Environment,
        | "CACHE_TTL_SECONDS"
        | "RECOMENDACAO_URL"
        | "RECOMENDACAO_SERVICE_TOKEN"
        | "RECOMENDACAO_TIMEOUT_MS"
      >
    > = {
    JWT_SECRET: process.env.JWT_SECRET,
    COOKIE_SECURE: false,
  },
  options: {
    cacheStore?: CacheStore;
    logCache?: LogCache;
    fotoStorage?: FotoStorage;
  } = {},
): Express {
  const cache = new CachePublico(
    options.cacheStore ?? new MemoryCacheStore(),
    (environment.CACHE_TTL_SECONDS ?? 60) * 1000,
  );
  const cacheHttp = new CacheHttp(cache, options.logCache);
  const healthRepository = new PrismaHealthRepository(prisma);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);
  const usuarioRepository = new PrismaUsuarioRepository(prisma);
  const authService = new AuthService(usuarioRepository);
  const authController = new AuthController(authService, environment);
  const autenticarUsuario = autenticar(authService, environment.JWT_SECRET);
  const usuarioController = new UsuarioController(
    new UsuarioService(usuarioRepository, cache),
  );

  const pedidoRepository = new PrismaPedidoRepository(prisma);
  const pedidoService = new PedidoService(pedidoRepository, cache);
  const pedidoController = new PedidoController(pedidoService);

  const recomendacaoStrategy = new HttpRecomendacaoClient({
    RECOMENDACAO_URL:
      environment.RECOMENDACAO_URL ??
      process.env.RECOMENDACAO_URL ??
      "http://127.0.0.1:3002",
    RECOMENDACAO_SERVICE_TOKEN:
      environment.RECOMENDACAO_SERVICE_TOKEN ??
      process.env.RECOMENDACAO_SERVICE_TOKEN ??
      "",
    RECOMENDACAO_TIMEOUT_MS: environment.RECOMENDACAO_TIMEOUT_MS ?? 800,
  });
  const catalogoRepository = new PrismaCatalogoRepository(prisma);
  const recomendacaoService = new RecomendacaoService(
    recomendacaoStrategy,
    catalogoRepository,
  );
  const recomendacaoController = new RecomendacaoController(
    recomendacaoService,
    new RecomendacaoService(recomendacaoStrategy, catalogoRepository),
    cacheHttp,
  );

  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogging);
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.use(createDocsRouter());
  app.use("/admin", autenticarUsuario, exigirPapel("admin"));
  app.use(
    createIndicadoresAdminRouter(
      new IndicadoresAdminController(
        new IndicadoresAdminService(
          new PrismaIndicadoresPlataformaRepository(prisma),
        ),
      ),
    ),
  );
  app.use(
    createGestaoProdutosRouter(
      new GestaoProdutosController(
        new GestaoProdutosService(
          new PrismaGestaoProdutosRepository(prisma),
          cache,
        ),
      ),
      autenticarUsuario,
    ),
  );
  app.use(createHealthRouter(healthController));
  app.use(createAuthRouter(authController));
  app.use(
    createCarrinhoRouter(
      new CarrinhoController(
        new CarrinhoService(new PrismaCarrinhoRepository(prisma)),
      ),
      autenticarUsuario,
    ),
  );
  app.use(createPedidoRouter(pedidoController, autenticarUsuario));
  app.use(
    createAvaliacaoRouter(
      new AvaliacaoController(
        new AvaliacaoService(new PrismaAvaliacaoRepository(prisma), cache),
      ),
      autenticarUsuario,
    ),
  );
  app.use(
    createIndicadoresRouter(
      new IndicadoresController(
        new IndicadoresService(new PrismaIndicadoresRepository(prisma)),
      ),
      autenticarUsuario,
    ),
  );
  app.use(
    createNotificacaoRouter(
      new NotificacaoController(
        new NotificacaoService(new PrismaNotificacaoRepository(prisma)),
      ),
      autenticarUsuario,
    ),
  );
  app.use(createUsuarioRouter(usuarioController, autenticarUsuario));
  app.use(
    createFotoPerfilRouter(
      new FotoPerfilController(
        new FotoPerfilService(
          new PrismaPerfilArtesaoRepository(prisma),
          options.fotoStorage ?? new VercelFotoStorage(),
          cache,
        ),
      ),
      autenticarUsuario,
    ),
  );
  app.use(
    createPerfilArtesaoRouter(
      new PerfilArtesaoController(
        new PerfilArtesaoService(
          new PrismaPerfilArtesaoRepository(prisma),
          cache,
        ),
      ),
      autenticarUsuario,
    ),
  );
  app.use(createRecomendacaoRouter(recomendacaoController, autenticarUsuario));
  app.use(
    createCatalogoRouter(
      new CatalogoController(
        new CatalogoService(catalogoRepository),
        cacheHttp,
      ),
    ),
  );
  app.use(errorMiddleware);

  return app;
}
