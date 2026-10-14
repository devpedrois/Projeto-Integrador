import type { CarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import type { Carrinho, ItemCarrinho } from "@/types/carrinho";
import type { Produto } from "@/types/produto";
import { ServiceError } from "@/services/errors";
import type { CarrinhoService } from "@/services/contracts/carrinho.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";

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
    throw new RangeError("Quantidade deve ser inteira e não negativa.");
  }
}

function calcularTotal(itens: ItemCarrinho[]): number {
  return itens.reduce(
    (soma, item) => soma + item.precoUnitario * item.quantidade,
    0,
  );
}

function validarEstoqueDisponivel(
  quantidadeSolicitada: number,
  estoqueDisponivel: number,
  nomeProduto: string,
  produtoId: string,
): void {
  if (quantidadeSolicitada > estoqueDisponivel) {
    throw new ServiceError(
      "ESTOQUE_INSUFICIENTE",
      `Estoque insuficiente para "${nomeProduto}".`,
      { produtoId, nome: nomeProduto },
    );
  }
}

export class CartStore {
  private carrinho: Carrinho;
  private readonly ouvintes = new Set<Ouvinte>();
  private estado: EstadoCarrinho = {
    carregando: false,
    enviando: false,
    erro: null,
    avisos: [],
  };
  private hidratacao: Promise<void> | null = null;
  private carregado = false;
  private fila: Promise<void> = Promise.resolve();
  private versao = 0;
  private visitante: CartStore | undefined;

  constructor(
    private readonly storage: CarrinhoStorage | null,
    private readonly remoto?: CarrinhoService,
    private readonly produtos?: Pick<ProdutosService, "obterPublico">,
    private readonly sessaoAtiva: () => boolean = () => true,
  ) {
    this.carrinho = remoto
      ? carrinhoVazio()
      : (this.storage?.ler() ?? carrinhoVazio());
    if (remoto) this.estado = { ...this.estado, carregando: true };
  }

  getSnapshot = (): Carrinho => this.carrinho;
  getEstadoSnapshot = (): EstadoCarrinho => this.estado;

  hidratar(visitante?: CartStore): Promise<void> {
    if (!this.remoto) return Promise.resolve();
    this.visitante ??= visitante;
    if (this.hidratacao) return this.hidratacao;
    if (this.carregado) return Promise.resolve();
    const versao = this.versao;
    this.definirEstado({ carregando: true, erro: null });
    this.hidratacao = this.carregar(versao)
      .catch((error: unknown) => {
        if (versao === this.versao)
          this.definirEstado({ erro: this.mensagem(error) });
        throw error;
      })
      .finally(() => {
        this.hidratacao = null;
        if (versao === this.versao) this.definirEstado({ carregando: false });
      });
    return this.hidratacao;
  }

  recarregar(): Promise<void> {
    this.carregado = false;
    return this.hidratar();
  }

  desconectar(): void {
    this.versao += 1;
    this.carregado = false;
    this.carrinho = carrinhoVazio();
    this.definirEstado({
      carregando: false,
      enviando: false,
      erro: null,
      avisos: [],
    });
  }

  private exigirSessao(versao: number): void {
    if (versao !== this.versao || !this.sessaoAtiva())
      throw new ServiceError(
        "NAO_AUTENTICADO",
        "Entre na sua conta para continuar.",
      );
  }

  private async carregar(versao: number): Promise<void> {
    const remoto = this.remoto;
    if (!remoto) return;
    this.exigirSessao(versao);
    const inicial = await remoto.obter();
    this.exigirSessao(versao);
    this.carrinho = inicial;
    this.notificar();
    if (this.visitante && this.produtos) {
      for (const item of [...this.visitante.getSnapshot().itens]) {
        this.exigirSessao(versao);
        await this.mesclarItem(item, versao);
        this.exigirSessao(versao);
        this.visitante.remover(item.produtoId);
      }
      this.visitante.limpar();
    }
    this.carregado = true;
  }

  private async mesclarItem(item: ItemCarrinho, versao: number): Promise<void> {
    const remoto = this.remoto;
    const produtos = this.produtos;
    if (!remoto || !produtos) return;
    const nome = typeof item.nome === "string" ? item.nome : "Produto";
    if (
      typeof item.produtoId !== "string" ||
      !item.produtoId.trim() ||
      !Number.isSafeInteger(item.quantidade) ||
      item.quantidade < 1
    ) {
      this.avisar(`${nome} foi descartado do carrinho de visitante.`);
      return;
    }
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      this.exigirSessao(versao);
      let produto: Produto | null;
      try {
        produto = await produtos.obterPublico(item.produtoId);
      } catch (error: unknown) {
        this.exigirSessao(versao);
        if (error instanceof ServiceError && error.code === "VALIDACAO") {
          this.avisar(`${nome} é inválido e foi descartado.`);
          return;
        }
        throw error;
      }
      this.exigirSessao(versao);
      if (!produto) {
        this.avisar(`${nome} está indisponível e foi descartado.`);
        return;
      }
      const existente =
        this.carrinho.itens.find((atual) => atual.produtoId === item.produtoId)
          ?.quantidade ?? 0;
      const quantidade = Math.min(
        item.quantidade,
        Math.max(0, produto.quantidadeEstoque - existente),
      );
      try {
        if (existente > produto.quantidadeEstoque) {
          const carrinho = await remoto.alterarQuantidade(
            produto.id,
            produto.quantidadeEstoque,
          );
          this.exigirSessao(versao);
          this.carrinho = carrinho;
          this.avisar(
            `${produto.nome}: quantidade limitada ao estoque disponível.`,
          );
          return;
        }
        if (quantidade === 0) {
          this.avisar(`${produto.nome} já atingiu o estoque disponível.`);
          return;
        }
        const carrinho = await remoto.adicionar(produto.id, quantidade);
        this.exigirSessao(versao);
        this.carrinho = carrinho;
        if (quantidade < item.quantidade)
          this.avisar(
            `${produto.nome}: quantidade limitada ao estoque disponível.`,
          );
        this.notificar();
        return;
      } catch (error: unknown) {
        this.exigirSessao(versao);
        if (
          error instanceof ServiceError &&
          ["NAO_ENCONTRADO", "PRODUTO_NAO_ENCONTRADO", "VALIDACAO"].includes(
            error.code,
          )
        ) {
          this.avisar(`${produto.nome} está indisponível e foi descartado.`);
          return;
        }
        if (
          !(error instanceof ServiceError) ||
          error.code !== "ESTOQUE_INSUFICIENTE" ||
          tentativa === 2
        )
          throw error;
        const atual = await remoto.obter();
        this.exigirSessao(versao);
        this.carrinho = atual;
      }
    }
  }

  private executar(operacao: () => Promise<Carrinho>): Promise<void> {
    const versao = this.versao;
    const resultado = this.fila
      .then(async () => {
        this.exigirSessao(versao);
        await this.hidratar();
        this.exigirSessao(versao);
        this.definirEstado({ enviando: true, erro: null });
        const carrinho = await operacao();
        this.exigirSessao(versao);
        this.carrinho = carrinho;
        this.notificar();
      })
      .catch((error: unknown) => {
        if (versao === this.versao)
          this.definirEstado({ erro: this.mensagem(error) });
        throw error;
      })
      .finally(() => {
        if (versao === this.versao) this.definirEstado({ enviando: false });
      });
    this.fila = resultado.catch(() => {});
    return resultado;
  }

  private mensagem(error: unknown): string {
    return error instanceof ServiceError
      ? error.message
      : "Não foi possível atualizar o carrinho. Tente novamente.";
  }
  private definirEstado(estado: Partial<EstadoCarrinho>): void {
    this.estado = { ...this.estado, ...estado };
    this.notificar();
  }
  private avisar(aviso: string): void {
    this.definirEstado({ avisos: [...this.estado.avisos, aviso] });
  }

  subscribe = (ouvinte: Ouvinte): (() => void) => {
    this.ouvintes.add(ouvinte);
    return () => this.ouvintes.delete(ouvinte);
  };

  adicionar(produto: Produto, quantidade: number): void | Promise<void> {
    validarQuantidadePositiva(quantidade);
    if (this.remoto)
      return this.executar(() =>
        this.remoto!.adicionar(produto.id, quantidade),
      );

    const indice = this.carrinho.itens.findIndex(
      (item) => item.produtoId === produto.id,
    );
    const itens = [...this.carrinho.itens];
    const quantidadeExistente =
      indice === -1 ? 0 : (itens[indice] as ItemCarrinho).quantidade;
    const quantidadeFinal = quantidadeExistente + quantidade;

    validarEstoqueDisponivel(
      quantidadeFinal,
      produto.quantidadeEstoque,
      produto.nome,
      produto.id,
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

  alterarQuantidade(
    produtoId: string,
    quantidade: number,
  ): void | Promise<void> {
    validarQuantidadeNaoNegativa(quantidade);

    if (quantidade === 0) {
      return this.remover(produtoId);
    }
    if (this.remoto)
      return this.executar(() =>
        this.remoto!.alterarQuantidade(produtoId, quantidade),
      );

    const item = this.carrinho.itens.find(
      (item) => item.produtoId === produtoId,
    );
    if (item) {
      validarEstoqueDisponivel(
        quantidade,
        item.estoqueDisponivel,
        item.nome,
        item.produtoId,
      );
    }

    const itens = this.carrinho.itens.map((item) =>
      item.produtoId === produtoId ? { ...item, quantidade } : item,
    );

    this.atualizar(itens);
  }

  remover(produtoId: string): void | Promise<void> {
    if (this.remoto)
      return this.executar(() => this.remoto!.remover(produtoId));
    const itens = this.carrinho.itens.filter(
      (item) => item.produtoId !== produtoId,
    );
    this.atualizar(itens);
  }

  registrarPedidoConfirmado(): void {
    this.storage?.limpar();
    this.carrinho = carrinhoVazio();
    this.notificar();
  }

  limpar(): void | Promise<void> {
    if (this.remoto)
      return this.executar(async () => {
        const versao = this.versao;
        let carrinho = this.carrinho;
        for (const item of [...carrinho.itens]) {
          this.exigirSessao(versao);
          carrinho = await this.remoto!.remover(item.produtoId);
        }
        return carrinho;
      });
    this.storage?.limpar();
    this.carrinho = carrinhoVazio();
    this.notificar();
  }

  private atualizar(itens: ItemCarrinho[]): void {
    this.carrinho = {
      itens,
      total: calcularTotal(itens),
      atualizadoEm: new Date().toISOString(),
    };
    this.storage?.salvar(this.carrinho);
    this.notificar();
  }

  private notificar(): void {
    for (const ouvinte of this.ouvintes) ouvinte();
  }
}

export interface EstadoCarrinho {
  carregando: boolean;
  enviando: boolean;
  erro: string | null;
  avisos: readonly string[];
}
