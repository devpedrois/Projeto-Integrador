import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { PedidoRepository } from "@/fake-api/repositories/pedido.repository";
import type {
  IndicadoresArtesaoService,
  IndicadoresArtesao,
} from "@/services/contracts/indicadores-artesao.contract";
import { ServiceError } from "@/services/errors";
import { lerIndicadoresArtesao } from "@/domain/indicadores-artesao";

interface Opcoes {
  obterArtesaoId: () => string | null;
  agora?: () => Date;
  latenciaMs?: number;
}

export class FakeIndicadoresArtesaoService implements IndicadoresArtesaoService {
  constructor(
    private readonly produtos: ProdutoRepository,
    private readonly pedidos: PedidoRepository,
    private readonly opcoes: Opcoes,
  ) {}

  async obter(): Promise<IndicadoresArtesao> {
    const artesaoId = this.opcoes.obterArtesaoId();
    if (!artesaoId)
      throw new ServiceError(
        "NAO_AUTENTICADO",
        "Entre como artesão para consultar suas vendas.",
      );
    const latencia = this.opcoes.latenciaMs ?? 0;
    if (latencia > 0)
      await new Promise((resolve) => setTimeout(resolve, latencia));
    const [produtos, pedidos] = await Promise.all([
      this.produtos.list(),
      this.pedidos.list(),
    ]);
    if (this.opcoes.obterArtesaoId() !== artesaoId)
      throw new ServiceError(
        "NAO_AUTENTICADO",
        "Sessão alterada durante a consulta.",
      );
    const proprios = new Set(
      produtos
        .filter((produto) => produto.artesaoId === artesaoId)
        .map((produto) => produto.id),
    );
    let quantidadeVendida = 0;
    let receitaCentavos = 0;
    let ultimaVenda: string | null = null;
    const pedidosConfirmados = new Set<string>();
    for (const pedido of pedidos) {
      if (pedido.status !== "confirmado") continue;
      for (const item of pedido.itens) {
        if (!proprios.has(item.produtoId)) continue;
        quantidadeVendida += item.quantidade;
        receitaCentavos +=
          Math.round(item.precoUnitario * 100) * item.quantidade;
        pedidosConfirmados.add(pedido.id);
        if (
          ultimaVenda === null ||
          Date.parse(pedido.criadoEm) > Date.parse(ultimaVenda)
        )
          ultimaVenda = pedido.criadoEm;
      }
    }
    return lerIndicadoresArtesao({
      quantidadeVendida,
      receitaTotal: receitaCentavos / 100,
      numeroPedidos: pedidosConfirmados.size,
      ultimaVenda,
      atualizadoEm: (this.opcoes.agora?.() ?? new Date()).toISOString(),
    });
  }
}
