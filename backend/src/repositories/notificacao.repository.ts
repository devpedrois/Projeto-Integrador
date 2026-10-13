import type { PrismaClient } from "../generated/prisma/client.js";
import type { TipoNotificacao } from "../generated/prisma/enums.js";

export interface NovaNotificacao {
  usuarioId: string;
  pedidoId: string;
  tipo: TipoNotificacao;
}

export interface NotificacaoRepository {
  registrarSeAusente(data: NovaNotificacao): Promise<boolean>;
}

export class PrismaNotificacaoRepository implements NotificacaoRepository {
  public constructor(private readonly prisma: Pick<PrismaClient, "notificacao">) {}

  public async registrarSeAusente(data: NovaNotificacao): Promise<boolean> {
    const result = await this.prisma.notificacao.createMany({
      data: [{ usuarioId: data.usuarioId, pedidoId: data.pedidoId, tipo: data.tipo }],
      skipDuplicates: true,
    });
    return result.count > 0;
  }
}
