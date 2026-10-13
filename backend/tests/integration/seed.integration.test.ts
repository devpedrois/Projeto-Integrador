import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "../../prisma/seed.js";
import { DEMO } from "../../prisma/seeds/demo.js";
import { seedUuid } from "../../prisma/seeds/id.js";
import { compararSenha } from "../../src/utils/senha.js";
import { criarBancoSeed, contagensSeed } from "../helpers/seed-database.js";

let banco: Awaited<ReturnType<typeof criarBancoSeed>>;
let primeiraContagem: Awaited<ReturnType<typeof contagensSeed>>;

beforeAll(async () => {
  banco = await criarBancoSeed();
  await runSeed(banco.prisma);
  primeiraContagem = await contagensSeed(banco.prisma);
  await runSeed(banco.prisma);
}, 60000);

afterAll(async () => {
  await banco?.fechar();
});

describe("BD-05 demo no PostgreSQL real", () => {
  it("mantem contagens apos duas execucoes", async () => {
    expect(await contagensSeed(banco.prisma)).toEqual(primeiraContagem);
    expect(primeiraContagem).toEqual({
      usuarios: 5,
      artesaos: 2,
      compradores: 2,
      perfis: 2,
      carrinhos: 2,
      categorias: 6,
      tecnicas: 10,
      regioes: 3,
      produtos: 30,
      fotos: 30,
      pedidos: 3,
      itens: 3,
      pagamentos: 3,
      avaliacoes: 10,
    });
  });
  it("autentica todas as contas documentadas", async () => {
    const documento = readFileSync(
      new URL("../../../docs/docs auxiliares/LOGINS_TESTE.md", import.meta.url),
      "utf8",
    );
    const contas = [
      ...documento.matchAll(
        /\| (?:Comprador|Artesao|Admin) \| ([^|]+) \| ([^|]+) \|/g,
      ),
    ];
    expect(contas.length).toBeGreaterThanOrEqual(4);
    for (const conta of contas) {
      const email = conta[1]?.trim();
      const senha = conta[2]?.trim();
      if (!email || !senha) throw new Error("Conta documentada invalida");
      const usuario = await banco.prisma.usuario.findUniqueOrThrow({
        where: { email },
      });
      expect(await compararSenha(senha, usuario.senhaHash)).toBe(true);
      expect(/^\$2[ab]\$10\$/.test(usuario.senhaHash)).toBe(true);
    }
  });
  it("preserva catalogo, fotos e referencias da Fake API", async () => {
    for (const produto of DEMO.produtos) {
      const salvo = await banco.prisma.produto.findUniqueOrThrow({
        where: { id: seedUuid(produto.id) },
        include: { fotos: true },
      });
      expect({
        nome: salvo.nome,
        descricao: salvo.descricao,
        preco: Number(salvo.preco),
        estoque: salvo.quantidadeEstoque,
        tecnica: salvo.tecnicaId,
        ativo: salvo.ativo,
        criadoEm: salvo.criadoEm.toISOString(),
      }).toEqual({
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        estoque: produto.quantidadeEstoque,
        tecnica: produto.tecnicaId,
        ativo: produto.ativo,
        criadoEm: produto.criadoEm,
      });
      expect(salvo.artesaoId).toBe(seedUuid(produto.artesaoId));
      expect(salvo.categoriaId).toBe(seedUuid(produto.categoriaId));
      expect(salvo.fotos.map(({ url, ordem }) => ({ url, ordem }))).toEqual(
        produto.fotos,
      );
    }
    for (const perfil of DEMO.perfis_artesao) {
      const salvo = await banco.prisma.perfilArtesao.findUniqueOrThrow({
        where: { usuarioId: seedUuid(perfil.artesaoId) },
      });
      expect(salvo.tecnicaPrincipalId).toBe(perfil.tecnicaId);
      expect(salvo.regiaoId).toBe(perfil.regiaoId || null);
    }
    for (const avaliacao of DEMO.avaliacoes) {
      const salvo = await banco.prisma.avaliacao.findUniqueOrThrow({
        where: { id: seedUuid(avaliacao.id) },
      });
      expect(salvo.nota).toBe(avaliacao.nota);
      expect(salvo.produtoId).toBe(seedUuid(avaliacao.produtoId));
    }
  });
  it("confirma pedidos com itens e pagamento coerente", async () => {
    const pedidos = await banco.prisma.pedido.findMany({
      include: { pagamento: true, itens: true },
    });
    for (const pedido of pedidos) {
      expect(pedido.status).toBe("confirmado");
      expect(pedido.pagamento?.metodo).toBe("pix_simulado");
      expect(pedido.pagamento?.status).toBe("aprovado");
      expect(Number(pedido.pagamento?.valor)).toBe(Number(pedido.total));
      expect(
        pedido.itens.reduce((total, item) => total + Number(item.subtotal), 0),
      ).toBe(Number(pedido.total));
    }
  });
});
