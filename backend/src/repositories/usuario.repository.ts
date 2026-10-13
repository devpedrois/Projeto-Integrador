import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import type { PapelUsuario } from "../generated/prisma/enums.js";
import { AppError } from "../errors/app-error.js";

export interface NovoUsuario {
  nome: string;
  email: string;
  senhaHash: string;
  papel?: PapelUsuario;
}

export interface UsuarioCriado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
}

export interface UsuarioRepository {
  criar(usuario: NovoUsuario): Promise<UsuarioCriado>;
}

const UNIQUE_VIOLATION = "P2002";

export class PrismaUsuarioRepository implements UsuarioRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async criar(usuario: NovoUsuario): Promise<UsuarioCriado> {
    try {
      return await this.prisma.usuario.create({
        data: usuario,
        select: { id: true, nome: true, email: true, papel: true },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new AppError(409, "EMAIL_JA_CADASTRADO", "Email ja cadastrado.");
      }
      throw error;
    }
  }
}
