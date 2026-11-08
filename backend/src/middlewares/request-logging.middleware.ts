import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { RequestHandler } from "express";
import { z } from "zod";
import { requestContext } from "../utils/request-context.js";

const uuidSchema = z.uuid();

export const requestLogging: RequestHandler = (request, response, next) => {
  const recebido = uuidSchema.safeParse(request.get("X-Request-Id"));
  const requestId = recebido.success ? recebido.data : randomUUID();
  const inicio = performance.now();
  response.locals.requestId = requestId;
  response.set("X-Request-Id", requestId);
  response.once("finish", () => {
    const route = request.route as { path?: unknown } | undefined;
    console.info(
      JSON.stringify({
        servico: "api",
        requestId,
        metodo: request.method,
        rota: typeof route?.path === "string" ? route.path : "[sem-rota]",
        status: response.statusCode,
        duracaoMs: Number((performance.now() - inicio).toFixed(3)),
      }),
    );
  });
  requestContext.run({ requestId }, next);
};
