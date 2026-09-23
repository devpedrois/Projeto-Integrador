import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { SessionModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import type { ModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { FakePedidosService } from "@/services/fake/pedidos.service";
import { FakeRecommendationAdapter } from "@/services/fake/recomendacoes/fake-recommendation.adapter";
import { FakeOpcoesFiltroService } from "@/services/fake/opcoes-filtro.service";
import { SessionStore } from "@/store/sessao.store";
import { CartStore } from "@/store/carrinho.store";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

const LATENCIA_PADRAO_MS = 300;
const USUARIO_VISITANTE = "visitante";

let instancia: UsuariosService | null = null;
let produtosServiceInstancia: ProdutosService | null = null;
let pedidosServiceInstancia: PedidosService | null = null;
let recomendacoesServiceInstancia: RecomendacoesService | null = null;
let opcoesFiltroServiceInstancia: OpcoesFiltroService | null = null;
let sessionStoreInstancia: SessionStore | null = null;
let modoAcessoStorageInstancia: ModoAcessoStorage | null = null;
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
 * Na AV1, `PedidosService` e implementado por `FakePedidosService`, que
 * revalida estoque contra o mesmo repositorio local de produtos. Na AV2,
 * este ponto de composicao troca para uma implementacao HTTP consumindo
 * `POST /pedidos`, sem alterar hooks, componentes ou paginas.
 */
export function obterPedidosService(): PedidosService {
  if (!pedidosServiceInstancia) {
    const produtoRepositorio = new BrowserProdutoRepository(window.localStorage);
    const pedidoRepositorio = new BrowserPedidoRepository(window.localStorage);
    pedidosServiceInstancia = new FakePedidosService(produtoRepositorio, pedidoRepositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return pedidosServiceInstancia;
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

export function obterModoAcessoStorage(): ModoAcessoStorage {
  if (!modoAcessoStorageInstancia) {
    modoAcessoStorageInstancia = new SessionModoAcessoStorage(window.sessionStorage);
  }
  return modoAcessoStorageInstancia;
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
