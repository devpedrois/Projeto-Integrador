import { beforeEach, describe, expect, it } from "vitest";
import { BrowserUsuarioRepository } from "@/fake-api/repositories/usuario.repository";
import { BrowserProdutoRepository } from "@/fake-api/repositories/produto.repository";
import { BrowserPedidoRepository } from "@/fake-api/repositories/pedido.repository";
import { FakeModeracaoService } from "@/services/fake/moderacao.service";
import { FakeProdutosService } from "@/services/fake/produtos.service";
import { FakeUsuariosService } from "@/services/fake/usuarios.service";
import { FakePedidosService } from "@/services/fake/pedidos.service";
import { FakeRecommendationAdapter } from "@/services/fake/recomendacoes/fake-recommendation.adapter";
import { produtoVisivelPublicamente } from "@/domain/produto-visibilidade";
import type { Usuario } from "@/types/usuario";

const CHAVE_USUARIOS = "origem:test:moderacao:usuarios:v1";
const CHAVE_PRODUTOS = "origem:test:moderacao:produtos:v1";
const CHAVE_PEDIDOS = "origem:test:moderacao:pedidos:v1";

const ADMIN_ID = "seed-admin-01";
const COMPRADOR_ID = "seed-comprador-01";
const ARTESAO_ID = "seed-artesao-01";

const ARTESAOS_EXTRAS: Usuario[] = [
  {
    id: "extra-artesao-03",
    nome: "Carla Artesa",
    email: "carla.artesa@origem.test",
    senha: "senha-sintetica-artesao-03",
    papel: "artesao",
    ativo: true,
  },
  {
    id: "extra-artesao-04",
    nome: "Davi Artesao",
    email: "davi.artesao@origem.test",
    senha: "senha-sintetica-artesao-04",
    papel: "artesao",
    ativo: true,
  },
];

function montar() {
  const usuarioRepo = new BrowserUsuarioRepository(window.localStorage, CHAVE_USUARIOS);
  const produtoRepo = new BrowserProdutoRepository(window.localStorage, CHAVE_PRODUTOS);
  const pedidoRepo = new BrowserPedidoRepository(window.localStorage, CHAVE_PEDIDOS);

  return {
    usuarioRepo,
    produtoRepo,
    pedidoRepo,
    moderacao: new FakeModeracaoService(usuarioRepo, produtoRepo, { latenciaMs: 0 }),
    produtos: new FakeProdutosService(produtoRepo, {
      latenciaMs: 0,
      usuarioRepositorio: usuarioRepo,
    }),
    usuarios: new FakeUsuariosService(usuarioRepo, { latenciaMs: 0 }),
    pedidos: new FakePedidosService(produtoRepo, pedidoRepo, {
      latenciaMs: 0,
      usuarioRepositorio: usuarioRepo,
    }),
    recomendacoes: new FakeRecommendationAdapter(produtoRepo, usuarioRepo),
  };
}

async function montarComQuatroArtesaos() {
  const contexto = montar();
  await contexto.usuarioRepo.seed();
  for (const artesao of ARTESAOS_EXTRAS) {
    await contexto.usuarioRepo.create(artesao);
  }
  return contexto;
}

async function quatroProdutosPublicos(contexto: ReturnType<typeof montar>) {
  const publicos = await contexto.produtos.list();
  return publicos.slice(0, 4);
}

beforeEach(() => {
  window.localStorage.removeItem(CHAVE_USUARIOS);
  window.localStorage.removeItem(CHAVE_PRODUTOS);
  window.localStorage.removeItem(CHAVE_PEDIDOS);
});

describe("FakeModeracaoService - listagens", () => {
  it("lista os quatro artesaos sem expor senha", async () => {
    const { moderacao } = await montarComQuatroArtesaos();

    const artesaos = await moderacao.listarArtesaos(ADMIN_ID);

    expect(artesaos).toHaveLength(4);
    expect(artesaos.every((artesao) => artesao.papel === "artesao")).toBe(true);
    for (const artesao of artesaos) {
      expect(artesao).not.toHaveProperty("senha");
    }
  });

  it("lista todos os produtos, inclusive os desativados", async () => {
    const contexto = montar();
    const [primeiro] = await quatroProdutosPublicos(contexto);
    await contexto.moderacao.desativarProduto(primeiro!.id, ADMIN_ID);

    const produtos = await contexto.moderacao.listarProdutos(ADMIN_ID);

    expect(produtos).toHaveLength(30);
    expect(produtos.find((produto) => produto.id === primeiro!.id)?.desativadoPorAdmin).toBe(
      true
    );
  });
});

describe("US17 - desativacao e reativacao de produto", () => {
  it("quatro produtos desativados somem da vitrine, busca, perfil e recomendacoes", async () => {
    const contexto = montar();
    const alvos = await quatroProdutosPublicos(contexto);
    const idsAlvo = new Set(alvos.map((produto) => produto.id));

    for (const alvo of alvos) {
      await contexto.moderacao.desativarProduto(alvo.id, ADMIN_ID);
    }

    const vitrine = await contexto.produtos.list();
    const busca = await contexto.produtos.search({});
    expect(vitrine.some((produto) => idsAlvo.has(produto.id))).toBe(false);
    expect(busca.some((produto) => idsAlvo.has(produto.id))).toBe(false);

    for (const alvo of alvos) {
      expect(await contexto.produtos.obterPublico(alvo.id)).toBeNull();
      const perfilPublico = (await contexto.produtos.listByArtesao(alvo.artesaoId)).filter(
        (produto) => produtoVisivelPublicamente(produto)
      );
      expect(perfilPublico.some((produto) => produto.id === alvo.id)).toBe(false);
    }

    const recomendacoes = await contexto.recomendacoes.obter({ usuarioId: COMPRADOR_ID });
    expect(recomendacoes.itens.some((produto) => idsAlvo.has(produto.id))).toBe(false);
  });

  it("dados dos produtos desativados permanecem no storage", async () => {
    const contexto = montar();
    const alvos = await quatroProdutosPublicos(contexto);

    for (const alvo of alvos) {
      await contexto.moderacao.desativarProduto(alvo.id, ADMIN_ID);
    }

    const armazenados = await new BrowserProdutoRepository(
      window.localStorage,
      CHAVE_PRODUTOS
    ).list();
    expect(armazenados).toHaveLength(30);
    for (const alvo of alvos) {
      expect(armazenados.find((produto) => produto.id === alvo.id)).toEqual({
        ...alvo,
        desativadoPorAdmin: true,
      });
    }
  });

  it("quatro produtos reativados voltam a aparecer na vitrine", async () => {
    const contexto = montar();
    const alvos = await quatroProdutosPublicos(contexto);
    for (const alvo of alvos) {
      await contexto.moderacao.desativarProduto(alvo.id, ADMIN_ID);
    }

    for (const alvo of alvos) {
      await contexto.moderacao.ativarProduto(alvo.id, ADMIN_ID);
    }

    const vitrine = await contexto.produtos.list();
    for (const alvo of alvos) {
      expect(vitrine.some((produto) => produto.id === alvo.id)).toBe(true);
      expect(await contexto.produtos.obterPublico(alvo.id)).not.toBeNull();
    }
  });

  it("produto desativado pelo admin continua no painel do dono", async () => {
    const contexto = montar();
    const [alvo] = await quatroProdutosPublicos(contexto);
    await contexto.moderacao.desativarProduto(alvo!.id, ADMIN_ID);

    const doDono = await contexto.produtos.listByArtesao(alvo!.artesaoId);

    expect(doDono.find((produto) => produto.id === alvo!.id)).toMatchObject({
      ativo: true,
      desativadoPorAdmin: true,
    });
  });

  it("reativar pelo admin nao restaura produto removido pelo artesao", async () => {
    const contexto = montar();
    const [alvo] = await quatroProdutosPublicos(contexto);
    await contexto.produtos.remove(alvo!.id, alvo!.artesaoId);

    await contexto.moderacao.desativarProduto(alvo!.id, ADMIN_ID);
    await contexto.moderacao.ativarProduto(alvo!.id, ADMIN_ID);

    expect(await contexto.produtos.obterPublico(alvo!.id)).toBeNull();
    const armazenado = await contexto.produtoRepo.findById(alvo!.id);
    expect(armazenado).toMatchObject({ ativo: false, desativadoPorAdmin: false });
  });

  it("rejeita produto inexistente", async () => {
    const { moderacao } = montar();

    await expect(moderacao.desativarProduto("inexistente", ADMIN_ID)).rejects.toMatchObject({
      code: "PRODUTO_NAO_ENCONTRADO",
    });
  });
});

describe("US17 - desativacao e reativacao de artesao", () => {
  it("quatro artesaos desativados nao iniciam sessao e seus produtos somem", async () => {
    const contexto = await montarComQuatroArtesaos();
    const artesaos = await contexto.moderacao.listarArtesaos(ADMIN_ID);
    const senhas = new Map(
      (await contexto.usuarioRepo.list()).map((usuario) => [usuario.email, usuario.senha])
    );

    for (const artesao of artesaos) {
      await contexto.moderacao.desativarArtesao(artesao.id, ADMIN_ID);
    }

    for (const artesao of artesaos) {
      await expect(
        contexto.usuarios.login({ email: artesao.email, senha: senhas.get(artesao.email)! })
      ).rejects.toMatchObject({ code: "CREDENCIAIS_INVALIDAS" });
    }

    const idsInativos = new Set(artesaos.map((artesao) => artesao.id));
    const vitrine = await contexto.produtos.list();
    const busca = await contexto.produtos.search({ artesaoId: ARTESAO_ID });
    const recomendacoes = await contexto.recomendacoes.obter({ usuarioId: COMPRADOR_ID });
    expect(vitrine.some((produto) => idsInativos.has(produto.artesaoId))).toBe(false);
    expect(busca).toEqual([]);
    expect(recomendacoes.itens).toEqual([]);

    const produtoDoArtesao = (await contexto.produtoRepo.list()).find(
      (produto) => produto.artesaoId === ARTESAO_ID
    );
    expect(await contexto.produtos.obterPublico(produtoDoArtesao!.id)).toBeNull();
  });

  it("dono continua vendo os proprios produtos ativos", async () => {
    const contexto = montar();
    await contexto.moderacao.desativarArtesao(ARTESAO_ID, ADMIN_ID);

    const doDono = await contexto.produtos.listByArtesao(ARTESAO_ID);

    expect(doDono.length).toBeGreaterThan(0);
    expect(doDono.every((produto) => produto.artesaoId === ARTESAO_ID)).toBe(true);
  });

  it("dados dos artesaos desativados permanecem no storage sem mudar papel ou senha", async () => {
    const contexto = await montarComQuatroArtesaos();
    const antes = await contexto.usuarioRepo.list();
    const artesaos = antes.filter((usuario) => usuario.papel === "artesao");

    for (const artesao of artesaos) {
      await contexto.moderacao.desativarArtesao(artesao.id, ADMIN_ID);
    }

    const depois = await new BrowserUsuarioRepository(
      window.localStorage,
      CHAVE_USUARIOS
    ).list();
    expect(depois).toHaveLength(antes.length);
    for (const artesao of artesaos) {
      expect(depois.find((usuario) => usuario.id === artesao.id)).toEqual({
        ...artesao,
        ativo: false,
      });
    }
  });

  it("quatro artesaos reativados voltam a entrar e seus produtos reaparecem", async () => {
    const contexto = await montarComQuatroArtesaos();
    const artesaos = await contexto.moderacao.listarArtesaos(ADMIN_ID);
    const vitrineAntes = await contexto.produtos.list();
    for (const artesao of artesaos) {
      await contexto.moderacao.desativarArtesao(artesao.id, ADMIN_ID);
    }

    for (const artesao of artesaos) {
      await contexto.moderacao.ativarArtesao(artesao.id, ADMIN_ID);
    }

    const sessao = await contexto.usuarios.login({
      email: "joao.artesao@origem.test",
      senha: "senha-sintetica-artesao",
    });
    expect(sessao.id).toBe(ARTESAO_ID);
    expect(await contexto.produtos.list()).toEqual(vitrineAntes);
  });

  it("rejeita alvo que nao e artesao", async () => {
    const { moderacao } = montar();

    await expect(moderacao.desativarArtesao(COMPRADOR_ID, ADMIN_ID)).rejects.toMatchObject({
      code: "ARTESAO_NAO_ENCONTRADO",
    });
  });

  it("admin nao desativa a si mesmo", async () => {
    const { moderacao, usuarioRepo } = montar();

    await expect(moderacao.desativarArtesao(ADMIN_ID, ADMIN_ID)).rejects.toMatchObject({
      code: "OPERACAO_NAO_PERMITIDA",
    });
    const admin = (await usuarioRepo.list()).find((usuario) => usuario.id === ADMIN_ID);
    expect(admin?.ativo).toBe(true);
  });
});

describe("FakeModeracaoService - autorizacao", () => {
  const sessoesNaoAdmin = [
    ["comprador", COMPRADOR_ID],
    ["artesao", ARTESAO_ID],
    ["inexistente", "sessao-forjada"],
  ] as const;

  it.each(sessoesNaoAdmin)("rejeita todas as operacoes para %s", async (_papel, sessaoId) => {
    const contexto = montar();
    const [produto] = await quatroProdutosPublicos(contexto);
    const { moderacao } = contexto;

    const tentativas = [
      moderacao.listarArtesaos(sessaoId),
      moderacao.listarProdutos(sessaoId),
      moderacao.desativarArtesao(ARTESAO_ID, sessaoId),
      moderacao.ativarArtesao(ARTESAO_ID, sessaoId),
      moderacao.desativarProduto(produto!.id, sessaoId),
      moderacao.ativarProduto(produto!.id, sessaoId),
    ];

    for (const tentativa of tentativas) {
      await expect(tentativa).rejects.toMatchObject({ code: "ACESSO_NEGADO" });
    }
    expect(await contexto.produtos.obterPublico(produto!.id)).not.toBeNull();
    const artesao = (await contexto.usuarioRepo.list()).find((u) => u.id === ARTESAO_ID);
    expect(artesao?.ativo).toBe(true);
  });

  it("rejeita admin desativado", async () => {
    const { moderacao, usuarioRepo } = montar();
    await usuarioRepo.seed();
    await usuarioRepo.update(ADMIN_ID, { ativo: false });

    await expect(moderacao.listarArtesaos(ADMIN_ID)).rejects.toMatchObject({
      code: "ACESSO_NEGADO",
    });
  });
});

describe("pedidos existentes apos moderacao", () => {
  it("preservam nome e preco do produto desativado", async () => {
    const contexto = montar();
    const [produto] = await quatroProdutosPublicos(contexto);
    const pedido = await contexto.pedidos.confirmar(
      [{ produtoId: produto!.id, quantidade: 1 }],
      COMPRADOR_ID
    );

    await contexto.moderacao.desativarProduto(produto!.id, ADMIN_ID);
    await contexto.moderacao.desativarArtesao(produto!.artesaoId, ADMIN_ID);

    const [armazenado] = await contexto.pedidoRepo.list();
    expect(armazenado).toEqual(pedido);
    expect(armazenado!.itens[0]).toMatchObject({
      produtoId: produto!.id,
      nome: produto!.nome,
      precoUnitario: produto!.preco,
    });
  });
});

describe("checkout apos moderacao", () => {
  it("rejeita produto desativado pelo admin sem baixar estoque", async () => {
    const contexto = montar();
    const [alvo] = await quatroProdutosPublicos(contexto);
    await contexto.moderacao.desativarProduto(alvo!.id, ADMIN_ID);

    await expect(
      contexto.pedidos.confirmar([{ produtoId: alvo!.id, quantidade: 1 }], COMPRADOR_ID)
    ).rejects.toMatchObject({ code: "PRODUTO_INDISPONIVEL" });
    expect((await contexto.produtoRepo.findById(alvo!.id))?.quantidadeEstoque).toBe(
      alvo!.quantidadeEstoque
    );
    expect(await contexto.pedidoRepo.list()).toEqual([]);
  });

  it("rejeita produto de artesao desativado que ja estava no carrinho", async () => {
    const contexto = montar();
    const [alvo] = await quatroProdutosPublicos(contexto);
    await contexto.moderacao.desativarArtesao(alvo!.artesaoId, ADMIN_ID);

    await expect(
      contexto.pedidos.confirmar([{ produtoId: alvo!.id, quantidade: 1 }], COMPRADOR_ID)
    ).rejects.toMatchObject({ code: "PRODUTO_INDISPONIVEL" });
    expect((await contexto.produtoRepo.findById(alvo!.id))?.quantidadeEstoque).toBe(
      alvo!.quantidadeEstoque
    );
    expect(await contexto.pedidoRepo.list()).toEqual([]);
  });

  it("aceita o pedido depois da reativacao", async () => {
    const contexto = montar();
    const [alvo] = await quatroProdutosPublicos(contexto);
    await contexto.moderacao.desativarArtesao(alvo!.artesaoId, ADMIN_ID);
    await contexto.moderacao.desativarProduto(alvo!.id, ADMIN_ID);
    await contexto.moderacao.ativarArtesao(alvo!.artesaoId, ADMIN_ID);
    await contexto.moderacao.ativarProduto(alvo!.id, ADMIN_ID);

    const pedido = await contexto.pedidos.confirmar(
      [{ produtoId: alvo!.id, quantidade: 1 }],
      COMPRADOR_ID
    );

    expect(pedido.itens[0]?.produtoId).toBe(alvo!.id);
  });
});
