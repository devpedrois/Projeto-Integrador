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

export type ElegibilidadeAvaliacao =
  | { podeAvaliar: true; motivo: null }
  | { podeAvaliar: false; motivo: "nao_comprou" | "ja_avaliou" };

export interface AvaliacaoRepository {
  elegibilidade(
    produtoId: string,
    compradorId: string,
  ): Promise<ElegibilidadeAvaliacao>;
  criar(
    input: CriarAvaliacaoInput,
    compradorId: string,
  ): Promise<AvaliacaoCriada>;
}

export class PrismaAvaliacaoRepository implements AvaliacaoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async elegibilidade(
    produtoId: string,
    compradorId: string,
  ): Promise<ElegibilidadeAvaliacao> {
    const [registro] = await this.prisma.$queryRaw<
      { comprou: boolean; avaliou: boolean }[]
    >`
      SELECT EXISTS (
        SELECT 1 FROM "Pedido" pedido
        JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
        WHERE pedido."compradorId" = ${compradorId}::uuid
          AND pedido."status" = 'confirmado' AND item."produtoId" = ${produtoId}::uuid
      ) AS comprou,
      EXISTS (
        SELECT 1 FROM "Avaliacao"
        WHERE "compradorId" = ${compradorId}::uuid AND "produtoId" = ${produtoId}::uuid
      ) AS avaliou
    `;
    if (!registro) throw new Error("Consulta de elegibilidade sem resultado");
    if (!registro.comprou) return { podeAvaliar: false, motivo: "nao_comprou" };
    if (registro.avaliou) return { podeAvaliar: false, motivo: "ja_avaliou" };
    return { podeAvaliar: true, motivo: null };
  }

  async criar(
    input: CriarAvaliacaoInput,
    compradorId: string,
  ): Promise<AvaliacaoCriada> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const compras = await transaction.$queryRaw<{ id: string }[]>`
          SELECT pedido."id"
          FROM "Pedido" pedido JOIN "ItemPedido" item ON item."pedidoId" = pedido."id"
          WHERE pedido."compradorId" = ${compradorId}::uuid
            AND pedido."status" = 'confirmado' AND item."produtoId" = ${input.produtoId}::uuid
          LIMIT 1 FOR SHARE OF pedido, item
        `;
        if (compras.length === 0)
          throw new AppError(
            403,
            "COMPRA_NAO_VERIFICADA",
            "Compra confirmada necessaria para avaliar.",
          );
        const { comentario, criadoEm, ...avaliacao } =
          await transaction.avaliacao.create({
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
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new AppError(
            409,
            "AVALIACAO_DUPLICADA",
            "Voce ja avaliou este produto.",
          );
      }
      throw error;
    }
  }
}
