import type { PrismaClient } from "../generated/prisma/client.js";
import type { TipoNotificacao } from "../generated/prisma/enums.js";

export interface NovaNotificacao {
  usuarioId: string;
  pedidoId: string;
  tipo: TipoNotificacao;
}

export interface NotificacaoRepository {
  registrarSeAusente(data: NovaNotificacao): Promise<boolean>;
  listarArtesaosDoPedido(pedidoId: string): Promise<string[]>;
  listarDoUsuario(usuarioId: string): Promise<NotificacaoResumo[]>;
  marcarComoLida(id: string, usuarioId: string): Promise<boolean>;
}

export interface NotificacaoResumo {
  id: string;
  pedidoId: string;
  tipo: TipoNotificacao;
  lida: boolean;
  criadoEm: Date;
}

export class PrismaNotificacaoRepository implements NotificacaoRepository {
  public constructor(
    private readonly prisma: Pick<PrismaClient, "notificacao" | "itemPedido">,
  ) {}

  public async listarArtesaosDoPedido(pedidoId: string): Promise<string[]> {
    const itens = await this.prisma.itemPedido.findMany({
      where: { pedidoId },
      select: { produto: { select: { artesaoId: true } } },
    });
    return [...new Set(itens.map((item) => item.produto.artesaoId))];
  }

  public async listarDoUsuario(
    usuarioId: string,
  ): Promise<NotificacaoResumo[]> {
    return this.prisma.notificacao.findMany({
      where: { usuarioId },
      orderBy: [{ lida: "asc" }, { criadoEm: "desc" }, { id: "asc" }],
      select: {
        id: true,
        pedidoId: true,
        tipo: true,
        lida: true,
        criadoEm: true,
      },
    });
  }

  public async marcarComoLida(id: string, usuarioId: string): Promise<boolean> {
    const result = await this.prisma.notificacao.updateMany({
      where: { id, usuarioId },
      data: { lida: true },
    });
    return result.count > 0;
  }

  public async registrarSeAusente(data: NovaNotificacao): Promise<boolean> {
    const result = await this.prisma.notificacao.createMany({
      data: [
        { usuarioId: data.usuarioId, pedidoId: data.pedidoId, tipo: data.tipo },
      ],
      skipDuplicates: true,
    });
    return result.count > 0;
  }
}
