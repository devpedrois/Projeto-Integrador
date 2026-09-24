import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { PedidoRepository } from "@/fake-api/repositories/pedido.repository";
import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { ItemPedido, ItemPedidoInput, Pedido } from "@/types/pedido";
import type { Produto } from "@/types/produto";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import { ServiceError } from "@/services/errors";
import { validarItensPedido } from "@/validators/pedido.validator";
import {
  idsArtesaosInativos,
  produtoDisponivelParaVenda,
} from "@/domain/produto-visibilidade";

export interface FakePedidosServiceOpcoes {
  latenciaMs?: number;
  usuarioRepositorio?: UsuarioRepository;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakePedidosService implements PedidosService {
  private readonly latenciaMs: number;
  private readonly usuarioRepositorio: UsuarioRepository | null;

  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly pedidoRepository: PedidoRepository,
    opcoes: FakePedidosServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
    this.usuarioRepositorio = opcoes.usuarioRepositorio ?? null;
  }

  async confirmar(itens: ItemPedidoInput[], compradorId: string): Promise<Pedido> {
    await aguardar(this.latenciaMs);

    if (itens.length === 0) {
      throw new ServiceError("CARRINHO_VAZIO", "O carrinho esta vazio.");
    }

    const erroItens = validarItensPedido(itens);
    if (erroItens === "QUANTIDADE_INVALIDA") {
      throw new ServiceError(erroItens, "Quantidade invalida no carrinho.");
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
          "Um dos produtos do carrinho nao esta mais disponivel.",
          { produtoId: item.produtoId }
        );
      }
      if (produto.quantidadeEstoque < item.quantidade) {
        throw new ServiceError(
          "ESTOQUE_INSUFICIENTE",
          `Estoque insuficiente para "${produto.nome}".`,
          { produtoId: produto.id, nome: produto.nome }
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
    };

    return this.pedidoRepository.create(pedido);
  }
}
