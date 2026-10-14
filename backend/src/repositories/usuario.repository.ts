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
  alterarPapel(
    id: string,
    papel: "comprador" | "artesao",
  ): Promise<UsuarioCriado>;
}

export interface NovoCadastroUsuario extends NovoUsuario {
  papel: "comprador" | "artesao";
}

export interface UsuarioAutenticacao extends UsuarioCriado {
  senhaHash: string;
  ativo: boolean;
}

export interface AuthUsuarioRepository extends UsuarioRepository {
  criarComEspecializacao(usuario: NovoCadastroUsuario): Promise<UsuarioCriado>;
  buscarPorEmail(email: string): Promise<UsuarioAutenticacao | null>;
  buscarAtivoPorId(id: string): Promise<UsuarioCriado | null>;
}

const usuarioPublicoSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
} as const;

const UNIQUE_VIOLATION = "P2002";

export class PrismaUsuarioRepository implements AuthUsuarioRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async criar(usuario: NovoUsuario): Promise<UsuarioCriado> {
    try {
      return await this.prisma.usuario.create({
        data: usuario,
        select: usuarioPublicoSelect,
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

  public async criarComEspecializacao(
    usuario: NovoCadastroUsuario,
  ): Promise<UsuarioCriado> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const criado = await transaction.usuario.create({
          data: usuario,
          select: usuarioPublicoSelect,
        });
        if (usuario.papel === "comprador") {
          await transaction.carrinho.create({ data: { usuarioId: criado.id } });
        } else {
          await transaction.perfilArtesao.create({
            data: { usuarioId: criado.id, completo: false },
          });
        }
        return criado;
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

  public buscarPorEmail(email: string): Promise<UsuarioAutenticacao | null> {
    return this.prisma.usuario.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { ...usuarioPublicoSelect, senhaHash: true, ativo: true },
    });
  }

  public buscarAtivoPorId(id: string): Promise<UsuarioCriado | null> {
    return this.prisma.usuario.findFirst({
      where: { id, ativo: true },
      select: usuarioPublicoSelect,
    });
  }

  public async alterarPapel(
    id: string,
    papel: "comprador" | "artesao",
  ): Promise<UsuarioCriado> {
    try {
      return await this.prisma.usuario.update({
        where: { id },
        data: { papel },
        select: usuarioPublicoSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError(
          404,
          "USUARIO_NAO_ENCONTRADO",
          "Usuario nao encontrado.",
        );
      }
      throw error;
    }
  }
}
