import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { PedidoRepository } from "@/fake-api/repositories/pedido.repository";
import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { ItemPedido, ItemPedidoInput, Pedido } from "@/types/pedido";
import type { Produto } from "@/types/produto";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type {
  DetalhePedido,
  PaginaPedidos,
  PaginacaoPedidos,
  ResumoPedido,
} from "@/types/pedido";
import { validarPaginacaoPedidos } from "@/domain/paginacao-pedidos";
import { ServiceError } from "@/services/errors";
import { validarItensPedido } from "@/validators/pedido.validator";
import {
  idsArtesaosInativos,
  produtoDisponivelParaVenda,
} from "@/domain/produto-visibilidade";

export interface FakePedidosServiceOpcoes {
  latenciaMs?: number;
  usuarioRepositorio?: UsuarioRepository;
  obterCompradorId?: () => string | null;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakePedidosService implements PedidosService {
  private readonly latenciaMs: number;
  private readonly usuarioRepositorio: UsuarioRepository | null;
  private readonly obterCompradorId: () => string | null;

  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly pedidoRepository: PedidoRepository,
    opcoes: FakePedidosServiceOpcoes = {},
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
    this.usuarioRepositorio = opcoes.usuarioRepositorio ?? null;
    this.obterCompradorId = opcoes.obterCompradorId ?? (() => null);
  }

  private compradorAtual(): string {
    const id = this.obterCompradorId();
    if (!id)
      throw new ServiceError(
        "NAO_AUTENTICADO",
        "Entre na sua conta para continuar.",
      );
    return id;
  }

  async listarMeus(input: PaginacaoPedidos = {}): Promise<PaginaPedidos> {
    const compradorId = this.compradorAtual();
    const { pagina, limite } = validarPaginacaoPedidos(input);
    await aguardar(this.latenciaMs);
    const pedidos = (await this.pedidoRepository.list())
      .filter((pedido) => pedido.compradorId === compradorId)
      .sort(
        (a, b) =>
          Date.parse(b.criadoEm) - Date.parse(a.criadoEm) ||
          b.id.localeCompare(a.id),
      );
    return {
      itens: pedidos
        .slice((pagina - 1) * limite, pagina * limite)
        .map((pedido) => this.resumo(pedido)),
      pagina,
      limite,
      total: pedidos.length,
    };
  }

  async obter(id: string): Promise<DetalhePedido> {
    const compradorId = this.compradorAtual();
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new ServiceError(
        "ENTRADA_INVALIDA",
        "Identificador de pedido inválido.",
      );
    await aguardar(this.latenciaMs);
    const pedido = (await this.pedidoRepository.list()).find(
      (registro) =>
        registro.id.toLowerCase() === id.toLowerCase() &&
        registro.compradorId === compradorId,
    );
    if (!pedido)
      throw new ServiceError("PEDIDO_NAO_ENCONTRADO", "Pedido não encontrado.");
    return {
      ...this.resumo(pedido),
      itens: pedido.itens.map((item, indice) => ({
        ...item,
        id: `${pedido.id}:${indice}`,
        status: "aguardando_envio",
        enviadoEm: null,
        subtotal:
          (Math.round(item.precoUnitario * 100) * item.quantidade) / 100,
      })),
    };
  }

  private resumo(pedido: Pedido): ResumoPedido {
    return {
      id: pedido.id,
      numeroConfirmacao: pedido.numeroConfirmacao,
      total: pedido.total,
      status: pedido.status,
      criadoEm: pedido.criadoEm,
      pagamento: pedido.pagamento ?? null,
    };
  }

  async confirmar(
    itens: ItemPedidoInput[],
    compradorId: string,
  ): Promise<Pedido> {
    await aguardar(this.latenciaMs);

    if (itens.length === 0) {
      throw new ServiceError("CARRINHO_VAZIO", "O carrinho está vazio.");
    }

    const erroItens = validarItensPedido(itens);
    if (erroItens === "QUANTIDADE_INVALIDA") {
      throw new ServiceError(erroItens, "Quantidade inválida no carrinho.");
    }
    if (erroItens === "ITEM_DUPLICADO") {
      throw new ServiceError(erroItens, "Produto repetido no carrinho.");
    }

    const artesaosInativos = this.usuarioRepositorio
      ? idsArtesaosInativos(await this.usuarioRepositorio.list())
      : new Set<string>();
    const produtosValidados: Produto[] = [];
    for (const item of itens) {
      const produto = await this.produtoRepository.findById(item.produtoId);
      if (!produto || !produtoDisponivelParaVenda(produto, artesaosInativos)) {
        throw new ServiceError(
          "PRODUTO_INDISPONIVEL",
          "Um dos produtos do carrinho não está mais disponível.",
          { produtoId: item.produtoId },
        );
      }
      if (produto.quantidadeEstoque < item.quantidade) {
        throw new ServiceError(
          "ESTOQUE_INSUFICIENTE",
          `Estoque insuficiente para "${produto.nome}".`,
          { produtoId: produto.id, nome: produto.nome },
        );
      }
      produtosValidados.push(produto);
    }

    const itensPedido: ItemPedido[] = [];
    let total = 0;

    for (let indice = 0; indice < itens.length; indice += 1) {
      const solicitado = itens[indice] as ItemPedidoInput;
      const produto = produtosValidados[indice] as Produto;

      await this.produtoRepository.update(produto.id, {
        quantidadeEstoque: produto.quantidadeEstoque - solicitado.quantidade,
        quantidadeVendida: produto.quantidadeVendida + solicitado.quantidade,
      });

      itensPedido.push({
        produtoId: produto.id,
        nome: produto.nome,
        precoUnitario: produto.preco,
        quantidade: solicitado.quantidade,
      });
      total += produto.preco * solicitado.quantidade;
    }

    const pedido: Pedido = {
      id: crypto.randomUUID(),
      compradorId,
      itens: itensPedido,
      total,
      numeroConfirmacao: crypto.randomUUID(),
      status: "confirmado",
      criadoEm: new Date().toISOString(),
      pagamento: {
        id: crypto.randomUUID(),
        metodo: "pix_simulado",
        status: "aprovado",
        valor: total,
        dataPagamento: new Date().toISOString(),
      },
    };

    return this.pedidoRepository.create(pedido);
  }
}
