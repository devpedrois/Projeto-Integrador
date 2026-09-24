import type { AvaliacaoRepository } from "@/fake-api/repositories/avaliacao.repository";
import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { Avaliacao, NovaAvaliacaoInput, ResumoAvaliacoes } from "@/types/avaliacao";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import { ServiceError } from "@/services/errors";
import { calcularResumoAvaliacoes } from "@/domain/resumo-avaliacoes";
import {
  idsArtesaosInativos,
  produtoDisponivelParaVenda,
} from "@/domain/produto-visibilidade";
import { avaliacaoValida, validarAvaliacao } from "@/validators/avaliacao.validator";

export interface FakeAvaliacoesServiceOpcoes {
  latenciaMs?: number;
  usuarioRepositorio?: UsuarioRepository;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maisRecentePrimeiro(a: Avaliacao, b: Avaliacao): number {
  if (a.criadoEm !== b.criadoEm) return a.criadoEm < b.criadoEm ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export class FakeAvaliacoesService implements AvaliacoesService {
  private readonly latenciaMs: number;
  private readonly usuarioRepositorio: UsuarioRepository | null;

  constructor(
    private readonly repositorio: AvaliacaoRepository,
    private readonly produtoRepositorio: ProdutoRepository,
    opcoes: FakeAvaliacoesServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
    this.usuarioRepositorio = opcoes.usuarioRepositorio ?? null;
  }

  async listByProduto(produtoId: string): Promise<Avaliacao[]> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    const avaliacoes = await this.repositorio.listByProdutoId(produtoId);
    return avaliacoes.sort(maisRecentePrimeiro);
  }

  async resumo(produtoId: string): Promise<ResumoAvaliacoes> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    const avaliacoes = await this.repositorio.listByProdutoId(produtoId);
    return calcularResumoAvaliacoes(produtoId, avaliacoes);
  }

  async create(input: NovaAvaliacaoInput, compradorId: string): Promise<Avaliacao> {
    if (compradorId.trim().length === 0) {
      throw new ServiceError("NAO_AUTENTICADO", "Entre na sua conta para avaliar.");
    }

    const erros = validarAvaliacao(input);
    if (!avaliacaoValida(erros)) {
      throw new ServiceError("AVALIACAO_INVALIDA", "Dados da avaliacao invalidos.", { erros });
    }

    await this.repositorio.seed();
    await this.produtoRepositorio.seed();
    await aguardar(this.latenciaMs);

    const produto = await this.produtoRepositorio.findById(input.produtoId);
    const artesaosInativos = this.usuarioRepositorio
      ? idsArtesaosInativos(await this.usuarioRepositorio.list())
      : new Set<string>();
    if (!produto || !produtoDisponivelParaVenda(produto, artesaosInativos)) {
      throw new ServiceError(
        "PRODUTO_NAO_ENCONTRADO",
        "Produto nao encontrado.",
        { produtoId: input.produtoId }
      );
    }

    const existentes = await this.repositorio.listByProdutoId(input.produtoId);
    if (existentes.some((avaliacao) => avaliacao.compradorId === compradorId)) {
      throw new ServiceError(
        "AVALIACAO_DUPLICADA",
        "Voce ja avaliou este produto.",
        { produtoId: input.produtoId }
      );
    }

    const comentario = input.comentario?.trim();
    const avaliacao: Avaliacao = {
      id: crypto.randomUUID(),
      produtoId: input.produtoId,
      compradorId,
      nota: input.nota,
      ...(comentario ? { comentario } : {}),
      criadoEm: new Date().toISOString(),
    };

    return this.repositorio.create(avaliacao);
  }
}
