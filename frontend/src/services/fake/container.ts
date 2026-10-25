import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { BrowserPerfilArtesaoRepository } from "@/fake-api/repositories/perfil-artesao.repository";
import { BrowserAvaliacaoRepository } from "@/fake-api/repositories/avaliacao.repository";
import { BrowserSessaoStorage } from "@/fake-api/storage/sessao.storage";
import { BrowserCarrinhoStorage } from "@/fake-api/storage/carrinho.storage";
import { SessionModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import type { ModoAcessoStorage } from "@/fake-api/storage/modo-acesso.storage";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { FakePedidosService } from "@/services/fake/pedidos.service";
import { FakePerfilArtesaoService } from "@/services/fake/perfil-artesao.service";
import { FakeAvaliacoesService } from "@/services/fake/avaliacoes.service";
import { FakeModeracaoService } from "@/services/fake/moderacao.service";
import { FakeRecommendationAdapter } from "@/services/fake/recomendacoes/fake-recommendation.adapter";
import { FakeOpcoesFiltroService } from "@/services/fake/opcoes-filtro.service";
import { criarVerificadorUsuarioAtivo } from "@/services/fake/verificar-usuario-ativo";
import { SessionStore } from "@/store/sessao.store";
import { CartStore } from "@/store/carrinho.store";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PedidosService } from "@/services/contracts/pedidos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import { HttpUsuariosService } from "@/services/http/usuarios.service";
import { HttpPerfilArtesaoService } from "@/services/http/perfil-artesao.service";
import { HttpCarrinhoService } from "@/services/http/carrinho.service";
import { HttpPedidosService } from "@/services/http/pedidos.service";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpModeracaoService } from "@/services/http/moderacao.service";
import { HttpOpcoesFiltroService } from "@/services/http/opcoes-filtro.service";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";
import { HttpRecommendationAdapter } from "@/services/http/recomendacoes.adapter";
import { obterFonteDados } from "@/services/data-source";
import { ServiceError } from "@/services/errors";
import type { NotificacoesService } from "@/services/contracts/notificacoes.contract";
import { HttpNotificacoesService } from "@/services/http/notificacoes.service";
import type { PedidosArtesaoService } from "@/services/contracts/pedidos-artesao.contract";
import { HttpPedidosArtesaoService } from "@/services/http/pedidos-artesao.service";
import type { IndicadoresArtesaoService } from "@/services/contracts/indicadores-artesao.contract";
import { HttpIndicadoresArtesaoService } from "@/services/http/indicadores-artesao.service";
import { FakeIndicadoresArtesaoService } from "@/services/fake/indicadores-artesao.service";

export const PENDENTES_HTTP: readonly string[] = [];

function modoHttp(): boolean {
  return obterFonteDados() === "http";
}

const produtosHttp: ProdutosService = new HttpProdutosService();
const pedidosHttp: PedidosService = new HttpPedidosService();
const perfilHttp: PerfilArtesaoService = new HttpPerfilArtesaoService();
const avaliacoesHttp: AvaliacoesService = new HttpAvaliacoesService();
const recomendacoesHttp: RecomendacoesService = new HttpRecommendationAdapter();
const opcoesHttp: OpcoesFiltroService = new HttpOpcoesFiltroService();
const moderacaoHttp: ModeracaoService = new HttpModeracaoService();
const notificacoesHttp: NotificacoesService = new HttpNotificacoesService();
const pedidosArtesaoHttp: PedidosArtesaoService =
  new HttpPedidosArtesaoService();
const indicadoresHttp: IndicadoresArtesaoService =
  new HttpIndicadoresArtesaoService();

export function obterPedidosArtesaoService(): PedidosArtesaoService | null {
  return modoHttp() ? pedidosArtesaoHttp : null;
}

export function obterNotificacoesService(): NotificacoesService | null {
  return modoHttp() ? notificacoesHttp : null;
}
let usuariosHttpInstancia: HttpUsuariosService | null = null;

function usuariosHttp(): HttpUsuariosService {
  usuariosHttpInstancia ??= new HttpUsuariosService();
  return usuariosHttpInstancia;
}

const LATENCIA_PADRAO_MS = 300;
const USUARIO_VISITANTE = "visitante";

let instancia: UsuariosService | null = null;
let avaliacoesServiceInstancia: AvaliacoesService | null = null;
let produtosServiceInstancia: ProdutosService | null = null;
let pedidosServiceInstancia: PedidosService | null = null;
let perfilArtesaoServiceInstancia: PerfilArtesaoService | null = null;
let recomendacoesServiceInstancia: RecomendacoesService | null = null;
let opcoesFiltroServiceInstancia: OpcoesFiltroService | null = null;
let moderacaoServiceInstancia: ModeracaoService | null = null;
let indicadoresServiceInstancia: IndicadoresArtesaoService | null = null;
let sessionStoreInstancia: SessionStore | null = null;
let modoAcessoStorageInstancia: ModoAcessoStorage | null = null;
const carrinhoStoresPorUsuario = new Map<string, CartStore>();
let compradorHttpAtual: string | null = null;

export function obterIndicadoresArtesaoService(): IndicadoresArtesaoService {
  if (modoHttp()) return indicadoresHttp;
  indicadoresServiceInstancia ??= new FakeIndicadoresArtesaoService(
    new BrowserProdutoRepository(window.localStorage),
    new BrowserPedidoRepository(window.localStorage),
    {
      latenciaMs: LATENCIA_PADRAO_MS,
      obterArtesaoId: () => {
        const sessao = obterSessionStore().getSnapshot();
        return sessao?.papel === "artesao" ? sessao.id : null;
      },
    },
  );
  return indicadoresServiceInstancia;
}

function acompanharCarrinhoHttp(): void {
  const sessao = sessionStoreInstancia?.getSnapshot();
  const compradorId = sessao?.papel === "comprador" ? sessao.id : null;
  if (compradorId === compradorHttpAtual) return;
  if (compradorHttpAtual) {
    carrinhoStoresPorUsuario.get(compradorHttpAtual)?.desconectar();
    carrinhoStoresPorUsuario.delete(compradorHttpAtual);
  }
  compradorHttpAtual = compradorId;
  if (compradorId)
    void obterCarrinhoStore(compradorId)
      .hidratar(obterCarrinhoLocal(USUARIO_VISITANTE))
      .catch(() => {});
}

export function obterUsuariosService(): UsuariosService {
  if (modoHttp()) return usuariosHttp();
  if (!instancia) {
    const repositorio = new BrowserUsuarioRepository(window.localStorage);
    instancia = new FakeUsuariosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return instancia;
}

export function obterProdutosService(): ProdutosService {
  if (modoHttp()) return produtosHttp;
  if (!produtosServiceInstancia) {
    const repositorio = new BrowserProdutoRepository(window.localStorage);
    produtosServiceInstancia = new FakeProdutosService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
      usuarioRepositorio: new BrowserUsuarioRepository(window.localStorage),
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
  if (modoHttp()) return pedidosHttp;
  if (!pedidosServiceInstancia) {
    const produtoRepositorio = new BrowserProdutoRepository(
      window.localStorage,
    );
    const pedidoRepositorio = new BrowserPedidoRepository(window.localStorage);
    pedidosServiceInstancia = new FakePedidosService(
      produtoRepositorio,
      pedidoRepositorio,
      {
        latenciaMs: LATENCIA_PADRAO_MS,
        usuarioRepositorio: new BrowserUsuarioRepository(window.localStorage),
        obterCompradorId: () => {
          const sessao = obterSessionStore().getSnapshot();
          return sessao?.papel === "comprador" ? sessao.id : null;
        },
      },
    );
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
  if (modoHttp()) return recomendacoesHttp;
  if (!recomendacoesServiceInstancia) {
    const repositorio = new BrowserProdutoRepository(window.localStorage);
    recomendacoesServiceInstancia = new FakeRecommendationAdapter(
      repositorio,
      new BrowserUsuarioRepository(window.localStorage),
    );
  }
  return recomendacoesServiceInstancia;
}

/**
 * Na AV1, `PerfilArtesaoService` e implementado por `FakePerfilArtesaoService`,
 * sobre o mesmo repositorio local. Na AV2, este ponto de composicao troca para
 * `HttpPerfilArtesaoService`, consumindo `GET/PATCH /usuarios/:id/perfil-artesao`.
 * Preserva os contratos de
 * hooks, componentes ou paginas.
 */
export function obterPerfilArtesaoService(): PerfilArtesaoService {
  if (modoHttp()) return perfilHttp;
  if (!perfilArtesaoServiceInstancia) {
    const repositorio = new BrowserPerfilArtesaoRepository(window.localStorage);
    perfilArtesaoServiceInstancia = new FakePerfilArtesaoService(repositorio, {
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return perfilArtesaoServiceInstancia;
}

/**
 * Na AV1, `AvaliacoesService` e implementado por `FakeAvaliacoesService` sobre
 * o repositorio local. Na AV2, este ponto de composicao troca para uma
 * implementacao HTTP consumindo `GET/POST /avaliacoes`, sem alterar hooks,
 * componentes ou paginas.
 */
export function obterAvaliacoesService(): AvaliacoesService {
  if (modoHttp()) return avaliacoesHttp;
  if (!avaliacoesServiceInstancia) {
    const repositorio = new BrowserAvaliacaoRepository(window.localStorage);
    const produtoRepositorio = new BrowserProdutoRepository(
      window.localStorage,
    );
    avaliacoesServiceInstancia = new FakeAvaliacoesService(
      repositorio,
      produtoRepositorio,
      {
        latenciaMs: LATENCIA_PADRAO_MS,
        usuarioRepositorio: new BrowserUsuarioRepository(window.localStorage),
        pedidoRepositorio: new BrowserPedidoRepository(window.localStorage),
      },
    );
  }
  return avaliacoesServiceInstancia;
}

/**
 * Na AV1, `ModeracaoService` e implementado por `FakeModeracaoService` sobre os
 * repositorios locais. Na AV2, este ponto de composicao troca para uma
 * implementacao HTTP consumindo as rotas `/admin/.../moderar`, sem alterar
 * hooks, componentes ou paginas.
 */
export function obterModeracaoService(): ModeracaoService {
  if (modoHttp()) return moderacaoHttp;
  if (!moderacaoServiceInstancia) {
    moderacaoServiceInstancia = new FakeModeracaoService(
      new BrowserUsuarioRepository(window.localStorage),
      new BrowserProdutoRepository(window.localStorage),
      { latenciaMs: LATENCIA_PADRAO_MS },
    );
  }
  return moderacaoServiceInstancia;
}

export function obterOpcoesFiltroService(): OpcoesFiltroService {
  if (modoHttp()) return opcoesHttp;
  if (!opcoesFiltroServiceInstancia) {
    opcoesFiltroServiceInstancia = new FakeOpcoesFiltroService({
      latenciaMs: LATENCIA_PADRAO_MS,
    });
  }
  return opcoesFiltroServiceInstancia;
}

export function obterSessionStore(): SessionStore {
  if (!sessionStoreInstancia) {
    if (modoHttp()) {
      sessionStoreInstancia = new SessionStore(null, usuariosHttp());
      sessionStoreInstancia.subscribe(acompanharCarrinhoHttp);
      void sessionStoreInstancia.hidratar();
      return sessionStoreInstancia;
    }
    sessionStoreInstancia = new SessionStore(
      new BrowserSessaoStorage(window.localStorage),
    );
    void sessionStoreInstancia.revalidar(
      criarVerificadorUsuarioAtivo(
        new BrowserUsuarioRepository(window.localStorage),
      ),
    );
  }
  return sessionStoreInstancia;
}

export function obterModoAcessoStorage(): ModoAcessoStorage {
  if (!modoAcessoStorageInstancia) {
    modoAcessoStorageInstancia = new SessionModoAcessoStorage(
      window.sessionStorage,
    );
  }
  return modoAcessoStorageInstancia;
}

export function obterCarrinhoStore(usuarioId?: string): CartStore {
  if (modoHttp()) {
    const sessao = sessionStoreInstancia?.getSnapshot();
    if (sessao?.papel !== "comprador")
      return obterCarrinhoLocal(USUARIO_VISITANTE);
    if (usuarioId && usuarioId !== sessao.id)
      throw new ServiceError(
        "ACESSO_NEGADO",
        "Carrinho de outra conta indisponível.",
      );
    let store = carrinhoStoresPorUsuario.get(sessao.id);
    if (!store) {
      const compradorId = sessao.id;
      store = new CartStore(
        null,
        new HttpCarrinhoService(),
        produtosHttp,
        () => {
          const atual = sessionStoreInstancia?.getSnapshot();
          return atual?.id === compradorId && atual.papel === "comprador";
        },
      );
      carrinhoStoresPorUsuario.set(compradorId, store);
      void store
        .hidratar(obterCarrinhoLocal(USUARIO_VISITANTE))
        .catch(() => {});
    }
    return store;
  }
  const chave = usuarioId ?? USUARIO_VISITANTE;
  return obterCarrinhoLocal(chave);
}

function obterCarrinhoLocal(chave: string): CartStore {
  let store = carrinhoStoresPorUsuario.get(chave);
  if (!store) {
    store = new CartStore(
      new BrowserCarrinhoStorage(window.localStorage, chave),
    );
    carrinhoStoresPorUsuario.set(chave, store);
  }
  return store;
}
