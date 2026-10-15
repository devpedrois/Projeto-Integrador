import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { openapi } from "../docs/openapi.js";

export function createDocsRouter(): Router {
  const router = Router();
  router.use(
    "/docs",
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );
  router.get("/docs/openapi.json", (_request, response) => {
    response.json(openapi);
  });
  const options = {
    swaggerOptions: { url: "/docs/openapi.json", validatorUrl: null },
  };
  const ui = swaggerUi.setup(undefined, options);
  router.get("/docs", (request, response, next) => {
    if (!request.path.endsWith("/")) {
      response.redirect(308, "/docs/");
      return;
    }
    ui(request, response, next);
  });
  router.use("/docs", swaggerUi.serveFiles(undefined, options));
  return router;
}
