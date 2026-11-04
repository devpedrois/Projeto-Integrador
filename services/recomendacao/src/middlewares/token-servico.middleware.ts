import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export function tokenServico(token: string): RequestHandler {
  const expected = createHash("sha256").update(token).digest();
  return (request, response, next) => {
    const received = request.get("X-Service-Token");
    const actual = createHash("sha256")
      .update(received ?? "")
      .digest();
    const valid = timingSafeEqual(expected, actual);
    if (received === undefined || !valid) {
      response.status(401).json({ codigo: "TOKEN_SERVICO_INVALIDO" });
      return;
    }
    next();
  };
}
