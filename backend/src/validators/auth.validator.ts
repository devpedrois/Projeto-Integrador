import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../errors/app-error.js";
import { normalizarEmail } from "../services/usuario.service.js";

const emailSchema = z
  .string()
  .transform(normalizarEmail)
  .pipe(z.email().max(254))
  .meta({ format: "email", maxLength: 254 });
const senhaSchema = z
  .string()
  .min(1)
  .max(72)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72)
  .meta({
    format: "password",
    writeOnly: true,
    description: "Até 72 bytes UTF-8.",
  });

export const cadastroSchema = z.strictObject({
  nome: z.string().trim().min(3).max(120),
  email: emailSchema,
  senha: senhaSchema
    .refine((value) => value.length >= 8)
    .meta({
      minLength: 8,
      format: "password",
      writeOnly: true,
      description: "De 8 a 72 caracteres e até 72 bytes UTF-8.",
    }),
  papel: z.enum(["comprador", "artesao"]),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  senha: senhaSchema,
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

function validar(schema: typeof cadastroSchema | typeof loginSchema) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new AppError(400, "VALIDACAO", "Dados de autenticacao invalidos."));
      return;
    }
    request.body = result.data;
    next();
  };
}

export const validateCadastro = validar(cadastroSchema);
export const validateLogin = validar(loginSchema);
