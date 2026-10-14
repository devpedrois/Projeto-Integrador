import { AppError } from "../errors/app-error.js";
import type { CachePublico } from "../utils/cache.js";
import type { GestaoProdutosRepository } from "../repositories/gestao-produtos.repository.js";
import type { UsuarioCriado } from "../repositories/usuario.repository.js";
import type {
  ProdutoCreate,
  ProdutoPatch,
} from "../validators/gestao-produtos.validator.js";

export class GestaoProdutosService {
  constructor(
    private readonly repository: GestaoProdutosRepository,
    private readonly cache?: CachePublico,
  ) {}
  listarMeus(usuario: UsuarioCriado) {
    return this.repository.listar(usuario.id);
  }
  listarProdutos() {
    return this.repository.listar();
  }
  listarArtesaos() {
    return this.repository.listarArtesaos();
  }
  async criar(input: ProdutoCreate, usuario: UsuarioCriado) {
    const resultado = await this.repository.criar(input, usuario.id);
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
  async atualizar(id: string, input: ProdutoPatch, usuario: UsuarioCriado) {
    const resultado = await this.repository.atualizar(id, (atual) => {
      if (usuario.papel !== "admin" && atual.artesaoId !== usuario.id)
        throw new AppError(403, "ACESSO_NEGADO", "Acesso negado.");
      if (
        usuario.papel !== "admin" &&
        atual.desativadoPorAdmin &&
        input.ativo === true
      )
        throw new AppError(
          403,
          "OPERACAO_NAO_PERMITIDA",
          "Produto desativado pela administracao.",
        );
      return input;
    });
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
  remover(id: string, usuario: UsuarioCriado) {
    return this.atualizar(id, { ativo: false }, usuario);
  }
  async moderarProduto(id: string, ativo: boolean) {
    const resultado = await this.repository.moderarProduto(id, ativo);
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
  async moderarArtesao(id: string, ativo: boolean, usuario: UsuarioCriado) {
    if (id === usuario.id)
      throw new AppError(
        403,
        "OPERACAO_NAO_PERMITIDA",
        "Administrador nao pode moderar a propria conta.",
      );
    const resultado = await this.repository.moderarArtesao(id, ativo);
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
}
