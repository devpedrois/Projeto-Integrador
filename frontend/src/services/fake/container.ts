import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { FakeRecommendationAdapter } from "@/services/fake/recomendacoes/fake-recommendation.adapter";
import { FakeOpcoesFiltroService } from "@/services/fake/opcoes-filtro.service";
import { SessionStore } from "@/store/sessao.store";
import { CartStore } from "@/store/carrinho.store";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

const LATENCIA_PADRAO_MS = 300;
const USUARIO_VISITANTE = "visitante";

let instancia: UsuariosService | null = null;
let produtosServiceInstancia: ProdutosService | null = null;
let recomendacoesServiceInstancia: RecomendacoesService | null = null;
let opcoesFiltroServiceInstancia: OpcoesFiltroService | null = null;
let sessionStoreInstancia: SessionStore | null = null;
const carrinhoStoresPorUsuario = new Map<string, CartStore>();

export function obterUsuariosService(): UsuariosService {
  if (!instancia) {
    const repositorio = new BrowserUsuarioRepository(window.localStorage);
    instancia = new FakeUsuariosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return instancia;
}

export function obterProdutosService(): ProdutosService {
  if (!produtosServiceInstancia) {
    const repositorio = new BrowserProdutoRepository(window.localStorage);
    produtosServiceInstancia = new FakeProdutosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return produtosServiceInstancia;
}

/**
 * Na AV1, `RecomendacoesService` e implementado por `FakeRecommendationAdapter`
 * sobre o repositorio local. Na AV2, este ponto de composicao troca para
 * `HttpRecommendationAdapter` (services/http), consumindo `GET /recomendacoes`
 * sem alterar hooks, componentes ou paginas que dependem do contrato.
 */
export function obterRecomendacoesService(): RecomendacoesService {
  if (!recomendacoesServiceInstancia) {
    const repositorio = new BrowserProdutoRepository(window.localStorage);
    recomendacoesServiceInstancia = new FakeRecommendationAdapter(repositorio);
  }
  return recomendacoesServiceInstancia;
}

export function obterOpcoesFiltroService(): OpcoesFiltroService {
  if (!opcoesFiltroServiceInstancia) {
    opcoesFiltroServiceInstancia = new FakeOpcoesFiltroService({
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return opcoesFiltroServiceInstancia;
}

export function obterSessionStore(): SessionStore {
  if (!sessionStoreInstancia) {
    sessionStoreInstancia = new SessionStore(
      new BrowserSessaoStorage(window.localStorage)
    );
  }
  return sessionStoreInstancia;
}

export function obterCarrinhoStore(usuarioId?: string): CartStore {
  const chave = usuarioId ?? USUARIO_VISITANTE;
  let store = carrinhoStoresPorUsuario.get(chave);
  if (!store) {
    store = new CartStore(new BrowserCarrinhoStorage(window.localStorage, chave));
    carrinhoStoresPorUsuario.set(chave, store);
  }
  return store;
}
