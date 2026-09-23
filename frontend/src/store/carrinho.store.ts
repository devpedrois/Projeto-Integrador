import type { CarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import type { Carrinho, ItemCarrinho } from "@/types/carrinho";
import type { Produto } from "@/types/produto";
import { ServiceError } from "@/services/errors";

type Ouvinte = () => void;

function carrinhoVazio(): Carrinho {
  return { itens: [], total: 0, atualizadoEm: new Date().toISOString() };
}

function validarQuantidadePositiva(quantidade: number): void {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new RangeError("Quantidade deve ser inteira e positiva.");
  }
}

function validarQuantidadeNaoNegativa(quantidade: number): void {
  if (!Number.isInteger(quantidade) || quantidade < 0) {
    throw new RangeError("Quantidade deve ser inteira e nao negativa.");
  }
}

function calcularTotal(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + item.precoUnitario * item.quantidade, 0);
}

function validarEstoqueDisponivel(
  quantidadeSolicitada: number,
  estoqueDisponivel: number,
  nomeProduto: string,
  produtoId: string
): void {
  if (quantidadeSolicitada > estoqueDisponivel) {
    throw new ServiceError(
      "ESTOQUE_INSUFICIENTE",
      `Estoque insuficiente para "${nomeProduto}".`,
      { produtoId, nome: nomeProduto }
    );
  }
}

export class CartStore {
  private carrinho: Carrinho;
  private readonly ouvintes = new Set<Ouvinte>();

  constructor(private readonly storage: CarrinhoStorage) {
    this.carrinho = this.storage.ler() ?? carrinhoVazio();
  }

  getSnapshot = (): Carrinho => this.carrinho;

  subscribe = (ouvinte: Ouvinte): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  };

  adicionar(produto: Produto, quantidade: number): void {
    validarQuantidadePositiva(quantidade);

    const indice = this.carrinho.itens.findIndex((item) => item.produtoId === produto.id);
    const itens = [...this.carrinho.itens];
    const quantidadeExistente = indice === -1 ? 0 : (itens[indice] as ItemCarrinho).quantidade;
    const quantidadeFinal = quantidadeExistente + quantidade;

    validarEstoqueDisponivel(
      quantidadeFinal,
      produto.quantidadeEstoque,
      produto.nome,
      produto.id
    );

    if (indice === -1) {
      itens.push({
        produtoId: produto.id,
        nome: produto.nome,
        precoUnitario: produto.preco,
        quantidade,
        estoqueDisponivel: produto.quantidadeEstoque,
      });
    } else {
      const existente = itens[indice] as ItemCarrinho;
      itens[indice] = {
        ...existente,
        quantidade: quantidadeFinal,
        estoqueDisponivel: produto.quantidadeEstoque,
      };
    }

    this.atualizar(itens);
  }

  alterarQuantidade(produtoId: string, quantidade: number): void {
    validarQuantidadeNaoNegativa(quantidade);

    if (quantidade === 0) {
      this.remover(produtoId);
      return;
    }

    const item = this.carrinho.itens.find((item) => item.produtoId === produtoId);
    if (item) {
      validarEstoqueDisponivel(quantidade, item.estoqueDisponivel, item.nome, item.produtoId);
    }

    const itens = this.carrinho.itens.map((item) =>
      item.produtoId === produtoId ? { ...item, quantidade } : item
    );

    this.atualizar(itens);
  }

  remover(produtoId: string): void {
    const itens = this.carrinho.itens.filter((item) => item.produtoId !== produtoId);
    this.atualizar(itens);
  }

  limpar(): void {
    this.storage.limpar();
    this.carrinho = carrinhoVazio();
    this.notificar();
  }

  private atualizar(itens: ItemCarrinho[]): void {
    this.carrinho = {
      itens,
      total: calcularTotal(itens),
      atualizadoEm: new Date().toISOString(),
    };
    this.storage.salvar(this.carrinho);
    this.notificar();
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }
}
