import type { PrismaClient } from "../generated/prisma/client.js";
import { StatusIntencao } from "../generated/prisma/enums.js";

export interface IntencaoPendente {
  id: string;
  pedidoId: string;
}

export interface IntencaoNotificacaoRepository {
  listarPendentesOuFalha(): Promise<IntencaoPendente[]>;
  marcarComoPublicada(id: string): Promise<boolean>;
  registrarTentativa(id: string): Promise<boolean>;
  marcarComoProcessada(id: string): Promise<boolean>;
}

export class PrismaIntencaoNotificacaoRepository implements IntencaoNotificacaoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listarPendentesOuFalha(): Promise<IntencaoPendente[]> {
    return this.prisma.intencaoNotificacao.findMany({
      where: { status: { in: [StatusIntencao.pendente, StatusIntencao.falha] } },
      select: { id: true, pedidoId: true },
    });
  }

  public async marcarComoPublicada(id: string): Promise<boolean> {
    const result = await this.prisma.intencaoNotificacao.updateMany({
      where: { id, status: { in: [StatusIntencao.pendente, StatusIntencao.falha] } },
      data: { status: StatusIntencao.publicada },
    });
    return result.count > 0;
  }

  public async registrarTentativa(id: string): Promise<boolean> {
    const result = await this.prisma.intencaoNotificacao.updateMany({
      where: { id, status: { not: StatusIntencao.processada } },
      data: { tentativas: { increment: 1 } },
    });
    return result.count > 0;
  }

  public async marcarComoProcessada(id: string): Promise<boolean> {
    const result = await this.prisma.intencaoNotificacao.updateMany({
      where: { id, status: { not: StatusIntencao.processada } },
      data: { status: StatusIntencao.processada, processadaEm: new Date() },
    });
    return result.count > 0;
  }
}
