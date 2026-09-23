/**
 * Contrato publico do recurso de perfil do artesao.
 *
 * `FakePerfilArtesaoService` (services/fake) implementa este contrato
 * consultando o repositorio local do navegador (fake-api/repositories). Na
 * Avaliacao 2, uma implementacao HTTP equivalente (services/http) substitui
 * a fake sem alterar hooks, stores, componentes ou paginas que dependem
 * deste contrato.
 */
import type { PerfilArtesao, PerfilArtesaoInput } from "@/types/perfil-artesao";

export interface PerfilArtesaoService {
  obter(artesaoId: string): Promise<PerfilArtesao | null>;
  salvar(input: PerfilArtesaoInput, artesaoId: string): Promise<PerfilArtesao>;
}
