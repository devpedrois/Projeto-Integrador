import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { Produto } from "@/types/produto";
import type { NovoProdutoInput } from "@/types/novo-produto";
import type { ProdutoQuery } from "@/types/produto-query";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import { ServiceError } from "@/services/errors";
import { produtoValido, validarProduto } from "@/validators/produto.validator";
import { normalizarTexto } from "@/utils/normalizar-texto";

export interface FakeProdutosServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakeProdutosService implements ProdutosService {
  private readonly latenciaMs: number;

  constructor(
    private readonly repositorio: ProdutoRepository,
    opcoes: FakeProdutosServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async list(): Promise<Produto[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    return this.repositorio.list();
  }

  async create(input: NovoProdutoInput, artesaoId: string): Promise<Produto> {
    const erros = validarProduto(input);
    if (!produtoValido(erros)) {
      throw new ServiceError("PRODUTO_INVALIDO", "Dados do produto invalidos.");
    }

    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const produto: Produto = {
      id: crypto.randomUUID(),
      nome: input.nome.trim(),
      descricao: input.descricao.trim(),
      preco: input.preco,
      categoriaId: input.categoriaId,
      tecnicaId: "",
      regiaoId: "",
      artesaoId,
      fotos: input.fotos.map((foto, indice) => ({
        url: foto.url.trim(),
        ordem: indice,
      })),
      quantidadeEstoque: input.quantidadeEstoque,
      quantidadeVendida: 0,
      notaMedia: 0,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    return this.repositorio.create(produto);
  }

  async listByArtesao(artesaoId: string): Promise<Produto[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    const produtos = await this.repositorio.list();
    return produtos.filter(
      (produto) => produto.artesaoId === artesaoId && produto.ativo
    );
  }

  async update(
    id: string,
    input: NovoProdutoInput,
    artesaoId: string
  ): Promise<Produto> {
    const erros = validarProduto(input);
    if (!produtoValido(erros)) {
      throw new ServiceError("PRODUTO_INVALIDO", "Dados do produto invalidos.");
    }

    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const existente = await this.verificarPropriedade(id, artesaoId);

    const atualizado = await this.repositorio.update(existente.id, {
      nome: input.nome.trim(),
      descricao: input.descricao.trim(),
      preco: input.preco,
      categoriaId: input.categoriaId,
      fotos: input.fotos.map((foto, indice) => ({
        url: foto.url.trim(),
        ordem: indice,
      })),
      quantidadeEstoque: input.quantidadeEstoque,
    });

    if (!atualizado) {
      throw new ServiceError("PRODUTO_NAO_ENCONTRADO", "Produto nao encontrado.");
    }

    return atualizado;
  }

  async remove(id: string, artesaoId: string): Promise<void> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const existente = await this.verificarPropriedade(id, artesaoId);

    const atualizado = await this.repositorio.update(existente.id, {
      ativo: false,
    });

    if (!atualizado) {
      throw new ServiceError("PRODUTO_NAO_ENCONTRADO", "Produto nao encontrado.");
    }
  }

  async search(query: ProdutoQuery): Promise<Produto[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const produtos = await this.repositorio.list();
    const termoNormalizado = normalizarTexto(query.termo ?? "");

    return produtos.filter((produto) => {
      if (termoNormalizado !== "") {
        const alvo = normalizarTexto(`${produto.nome} ${produto.descricao}`);
        if (!alvo.includes(termoNormalizado)) return false;
      }
      if (query.categoriaId && produto.categoriaId !== query.categoriaId) return false;
      if (query.tecnicaId && produto.tecnicaId !== query.tecnicaId) return false;
      if (query.regiaoId && produto.regiaoId !== query.regiaoId) return false;
      return true;
    });
  }

  private async verificarPropriedade(
    id: string,
    artesaoId: string
  ): Promise<Produto> {
    const existente = await this.repositorio.findById(id);
    if (!existente || existente.artesaoId !== artesaoId) {
      throw new ServiceError(
        "ACESSO_NEGADO",
        "Produto nao encontrado para este artesao."
      );
    }
    return existente;
  }
}
