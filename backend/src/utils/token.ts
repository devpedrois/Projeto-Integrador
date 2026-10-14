import type { CookieOptions, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import type { UsuarioCriado } from "../repositories/usuario.repository.js";

const COOKIE_SESSAO = "origem_sessao";
const DURACAO_SESSAO_SEGUNDOS = 24 * 60 * 60;
const sessaoSchema = z.object({
  sub: z.uuid(),
  papel: z.enum(["comprador", "artesao", "admin"]),
  nome: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

function segredoConfigurado(secret: string | undefined): string {
  if (secret === undefined || secret.trim().length < 32) {
    throw new AppError(
      503,
      "AUTH_NAO_CONFIGURADA",
      "Autenticacao indisponivel.",
    );
  }
  return secret;
}

function opcoesCookie(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure, path: "/" };
}

export function iniciarSessao(
  response: Response,
  usuario: UsuarioCriado,
  secret: string | undefined,
  secure: boolean,
): void {
  const token = jwt.sign(
    { papel: usuario.papel, nome: usuario.nome },
    segredoConfigurado(secret),
    {
      algorithm: "HS256",
      subject: usuario.id,
      expiresIn: DURACAO_SESSAO_SEGUNDOS,
    },
  );
  response.cookie(COOKIE_SESSAO, token, {
    ...opcoesCookie(secure),
    maxAge: DURACAO_SESSAO_SEGUNDOS * 1_000,
  });
}

export function encerrarSessao(response: Response, secure: boolean): void {
  response.clearCookie(COOKIE_SESSAO, opcoesCookie(secure));
}

export function lerSessao(
  request: Request,
  secret: string | undefined,
): z.infer<typeof sessaoSchema> {
  const cookies = request.cookies as Record<string, unknown>;
  const token = cookies[COOKIE_SESSAO];
  const semSessao = new AppError(
    401,
    "NAO_AUTENTICADO",
    "Sessao invalida ou ausente.",
  );
  if (typeof token !== "string" || token.length === 0) throw semSessao;
  const key = segredoConfigurado(secret);
  try {
    const payload: unknown = jwt.verify(token, key, {
      algorithms: ["HS256"],
      maxAge: DURACAO_SESSAO_SEGUNDOS,
    });
    const result = sessaoSchema.safeParse(payload);
    if (!result.success) throw semSessao;
    return result.data;
  } catch {
    throw semSessao;
  }
}
