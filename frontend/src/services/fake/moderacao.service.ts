import type { UsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import type { ProdutoRepository } from "@/fake-api/repositories/produto.repository";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";
import { paraUsuarioPublico, type UsuarioPublico } from "@/types/usuario";

export interface FakeModeracaoServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function idValido(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

export class FakeModeracaoService implements ModeracaoService {
  private readonly latenciaMs: number;

  constructor(
    private readonly usuarioRepositorio: UsuarioRepository,
    private readonly produtoRepositorio: ProdutoRepository,
    opcoes: FakeModeracaoServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async listarArtesaos(adminId: string): Promise<UsuarioPublico[]> {
    await this.exigirAdmin(adminId);
    const usuarios = await this.usuarioRepositorio.list();
    return usuarios
      .filter((usuario) => usuario.papel === "artesao")
      .map(paraUsuarioPublico);
  }

  async listarProdutos(adminId: string): Promise<Produto[]> {
    await this.exigirAdmin(adminId);
    await this.produtoRepositorio.seed();
    return this.produtoRepositorio.list();
  }

  ativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico> {
    return this.definirStatusArtesao(artesaoId, adminId, true);
  }

  desativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico> {
    return this.definirStatusArtesao(artesaoId, adminId, false);
  }

  ativarProduto(produtoId: string, adminId: string): Promise<Produto> {
    return this.definirStatusProduto(produtoId, adminId, true);
  }

  desativarProduto(produtoId: string, adminId: string): Promise<Produto> {
    return this.definirStatusProduto(produtoId, adminId, false);
  }

  private async definirStatusArtesao(
    artesaoId: string,
    adminId: string,
    ativo: boolean
  ): Promise<UsuarioPublico> {
    await this.exigirAdmin(adminId);

    if (artesaoId === adminId) {
      throw new ServiceError(
        "OPERACAO_NAO_PERMITIDA",
        "O administrador nao pode moderar a propria conta."
      );
    }

    const usuarios = await this.usuarioRepositorio.list();
    const alvo = idValido(artesaoId)
      ? usuarios.find((usuario) => usuario.id === artesaoId)
      : undefined;
    if (!alvo || alvo.papel !== "artesao") {
      throw new ServiceError("ARTESAO_NAO_ENCONTRADO", "Artesao nao encontrado.");
    }

    const atualizado = await this.usuarioRepositorio.update(alvo.id, { ativo });
    if (!atualizado) {
      throw new ServiceError("ARTESAO_NAO_ENCONTRADO", "Artesao nao encontrado.");
    }
    return paraUsuarioPublico(atualizado);
  }

  private async definirStatusProduto(
    produtoId: string,
    adminId: string,
    ativo: boolean
  ): Promise<Produto> {
    await this.exigirAdmin(adminId);
    await this.produtoRepositorio.seed();

    const atualizado = idValido(produtoId)
      ? await this.produtoRepositorio.update(produtoId, { desativadoPorAdmin: !ativo })
      : null;
    if (!atualizado) {
      throw new ServiceError("PRODUTO_NAO_ENCONTRADO", "Produto nao encontrado.");
    }
    return atualizado;
  }

  private async exigirAdmin(adminId: string): Promise<void> {
    await this.usuarioRepositorio.seed();
    await aguardar(this.latenciaMs);

    const usuarios = await this.usuarioRepositorio.list();
    const sessao = idValido(adminId)
      ? usuarios.find((usuario) => usuario.id === adminId)
      : undefined;
    if (!sessao || sessao.papel !== "admin" || !sessao.ativo) {
      throw new ServiceError(
        "ACESSO_NEGADO",
        "Somente administradores podem moderar cadastros."
      );
    }
  }
}
