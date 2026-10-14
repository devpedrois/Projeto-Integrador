import { AppError } from "../errors/app-error.js";
import type { GestaoProdutosRepository } from "../repositories/gestao-produtos.repository.js";
import type { UsuarioCriado } from "../repositories/usuario.repository.js";
import type {
  ProdutoCreate,
  ProdutoPatch,
} from "../validators/gestao-produtos.validator.js";

export class GestaoProdutosService {
  constructor(private readonly repository: GestaoProdutosRepository) {}
  listarMeus(usuario: UsuarioCriado) {
    return this.repository.listar(usuario.id);
  }
  listarProdutos() {
    return this.repository.listar();
  }
  listarArtesaos() {
    return this.repository.listarArtesaos();
  }
  criar(input: ProdutoCreate, usuario: UsuarioCriado) {
    return this.repository.criar(input, usuario.id);
  }
  atualizar(id: string, input: ProdutoPatch, usuario: UsuarioCriado) {
    return this.repository.atualizar(id, (atual) => {
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
  }
  remover(id: string, usuario: UsuarioCriado) {
    return this.atualizar(id, { ativo: false }, usuario);
  }
  moderarProduto(id: string, ativo: boolean) {
    return this.repository.moderarProduto(id, ativo);
  }
  moderarArtesao(id: string, ativo: boolean, usuario: UsuarioCriado) {
    if (id === usuario.id)
      throw new AppError(
        403,
        "OPERACAO_NAO_PERMITIDA",
        "Administrador nao pode moderar a propria conta.",
      );
    return this.repository.moderarArtesao(id, ativo);
  }
}
