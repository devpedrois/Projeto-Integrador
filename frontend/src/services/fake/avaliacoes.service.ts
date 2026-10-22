import type { AvaliacaoRepository } from "@/fake-api/repositories/avaliacao.repository";
import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { PedidoRepository } from "@/fake-api/repositories/pedido.repository";
import type {
  Avaliacao,
  NovaAvaliacaoInput,
  ResumoAvaliacoes,
  ElegibilidadeAvaliacao,
} from "@/types/avaliacao";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import { ServiceError } from "@/services/errors";
import { calcularResumoAvaliacoes } from "@/domain/resumo-avaliacoes";
import {
  idsArtesaosInativos,
  produtoDisponivelParaVenda,
} from "@/domain/produto-visibilidade";
import {
  avaliacaoValida,
  validarAvaliacao,
} from "@/validators/avaliacao.validator";

export interface FakeAvaliacoesServiceOpcoes {
  latenciaMs?: number;
  usuarioRepositorio?: UsuarioRepository;
  pedidoRepositorio?: PedidoRepository;
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
  private readonly pedidoRepositorio: PedidoRepository | null;

  constructor(
    private readonly repositorio: AvaliacaoRepository,
    private readonly produtoRepositorio: ProdutoRepository,
    opcoes: FakeAvaliacoesServiceOpcoes = {},
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
    this.usuarioRepositorio = opcoes.usuarioRepositorio ?? null;
    this.pedidoRepositorio = opcoes.pedidoRepositorio ?? null;
  }

  async elegibilidade(
    produtoId: string,
    compradorId: string,
  ): Promise<ElegibilidadeAvaliacao> {
    const [pedidos, avaliacoes] = await Promise.all([
      this.pedidoRepositorio?.list() ?? Promise.resolve([]),
      this.listByProduto(produtoId),
    ]);
    const comprou = pedidos.some(
      (pedido) =>
        pedido.compradorId === compradorId &&
        pedido.status === "confirmado" &&
        pedido.itens.some((item) => item.produtoId === produtoId),
    );
    if (!comprou) return { podeAvaliar: false, motivo: "nao_comprou" };
    if (avaliacoes.some((avaliacao) => avaliacao.compradorId === compradorId))
      return { podeAvaliar: false, motivo: "ja_avaliou" };
    return { podeAvaliar: true, motivo: null };
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

  criar(input: NovaAvaliacaoInput, compradorId: string): Promise<Avaliacao> {
    return this.create(input, compradorId);
  }

  async create(
    input: NovaAvaliacaoInput,
    compradorId: string,
  ): Promise<Avaliacao> {
    if (compradorId.trim().length === 0) {
      throw new ServiceError(
        "NAO_AUTENTICADO",
        "Entre na sua conta para avaliar.",
      );
    }

    const erros = validarAvaliacao(input);
    if (!avaliacaoValida(erros)) {
      throw new ServiceError(
        "AVALIACAO_INVALIDA",
        "Dados da avaliação inválidos.",
        { erros },
      );
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
        "Produto não encontrado.",
        { produtoId: input.produtoId },
      );
    }

    const elegibilidade = await this.elegibilidade(
      input.produtoId,
      compradorId,
    );
    if (!elegibilidade.podeAvaliar && elegibilidade.motivo === "nao_comprou")
      throw new ServiceError(
        "COMPRA_NAO_VERIFICADA",
        "Compra confirmada necessária para avaliar.",
      );
    if (!elegibilidade.podeAvaliar) {
      throw new ServiceError(
        "AVALIACAO_DUPLICADA",
        "Você já avaliou este produto.",
        { produtoId: input.produtoId },
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
