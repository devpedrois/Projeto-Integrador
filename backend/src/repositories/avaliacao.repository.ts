import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import type { CriarAvaliacaoInput } from "../validators/avaliacao.validator.js";
import { AppError } from "../errors/app-error.js";

export interface AvaliacaoCriada {
  id: string;
  produtoId: string;
  compradorId: string;
  nota: number;
  comentario?: string;
  criadoEm: string;
}

export interface AvaliacaoRepository {
  criar(
    input: CriarAvaliacaoInput,
    compradorId: string,
  ): Promise<AvaliacaoCriada>;
}

export class PrismaAvaliacaoRepository implements AvaliacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async criar(
    input: CriarAvaliacaoInput,
    compradorId: string,
  ): Promise<AvaliacaoCriada> {
    try {
      const { comentario, criadoEm, ...avaliacao } =
        await this.prisma.avaliacao.create({
          data: {
            produtoId: input.produtoId,
            compradorId,
            nota: input.nota,
            comentario: input.comentario || null,
          },
          select: {
            id: true,
            produtoId: true,
            compradorId: true,
            nota: true,
            comentario: true,
            criadoEm: true,
          },
        });
      return {
        ...avaliacao,
        ...(comentario === null ? {} : { comentario }),
        criadoEm: criadoEm.toISOString(),
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new AppError(
            409,
            "AVALIACAO_DUPLICADA",
            "Voce ja avaliou este produto.",
          );
        if (error.code === "P2003")
          throw new AppError(
            404,
            "PRODUTO_NAO_ENCONTRADO",
            "Produto nao encontrado.",
          );
      }
      throw error;
    }
  }
}
