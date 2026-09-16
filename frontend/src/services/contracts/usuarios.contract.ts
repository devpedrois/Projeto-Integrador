/**
 * Contrato publico do recurso de usuarios.
 *
 * `FakeUsuariosService` (services/fake) implementa este contrato consultando
 * o repositorio local do navegador (fake-api/repositories). Na Avaliacao 2,
 * uma implementacao HTTP equivalente (services/http) substitui a fake sem
 * alterar hooks, stores, componentes ou paginas que dependem deste contrato.
 */
import type { CadastroInput } from "@/types/cadastro";
import type { UsuarioPublico } from "@/types/usuario";

export interface UsuariosService {
  list(): Promise<UsuarioPublico[]>;
  /**
   * Cria um usuario comprador ou artesao. Retorna o DTO publico, sem sessao:
   * a autenticacao e a sessao chegam em T02.1.
   */
  register(input: CadastroInput): Promise<UsuarioPublico>;
}
