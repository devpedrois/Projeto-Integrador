/**
 * Contrato publico do recurso de usuarios.
 *
 * `FakeUsuariosService` (services/fake) implementa este contrato consultando
 * o repositorio local do navegador (fake-api/repositories). Na Avaliacao 2,
 * uma implementacao HTTP equivalente (services/http) substitui a fake sem
 * alterar hooks, stores, componentes ou paginas que dependem deste contrato.
 */
import type { UsuarioPublico } from "@/types/usuario";

export interface UsuariosService {
  list(): Promise<UsuarioPublico[]>;
}
