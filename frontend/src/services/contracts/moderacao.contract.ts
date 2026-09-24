/**
 * Contrato publico da moderacao administrativa (US17).
 *
 * `FakeModeracaoService` (services/fake) implementa este contrato sobre os
 * repositorios locais. Na Avaliacao 2, uma implementacao HTTP consumindo
 * `PATCH /admin/artesaos/:id/moderar` e `PATCH /admin/produtos/:id/moderar`
 * substitui a fake sem alterar hooks, componentes ou paginas.
 *
 * Toda operacao recebe o id da sessao e rejeita quem nao for admin ativo.
 * Desativar e sempre logico: nenhum dado e apagado.
 */
import type { Produto } from "@/types/produto";
import type { UsuarioPublico } from "@/types/usuario";

export interface ModeracaoService {
  listarArtesaos(adminId: string): Promise<UsuarioPublico[]>;
  listarProdutos(adminId: string): Promise<Produto[]>;
  ativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico>;
  desativarArtesao(artesaoId: string, adminId: string): Promise<UsuarioPublico>;
  ativarProduto(produtoId: string, adminId: string): Promise<Produto>;
  desativarProduto(produtoId: string, adminId: string): Promise<Produto>;
}
