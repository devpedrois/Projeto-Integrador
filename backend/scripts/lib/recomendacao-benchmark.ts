import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { createApp } from "../../src/app.js";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { MemoryCacheStore } from "../../src/utils/cache.js";
import { CategoriaRecomendacaoStrategy } from "../../src/integrations/recommendation/categoria-recomendacao.strategy.js";
import { PrismaRecomendacaoRepository } from "../../src/repositories/recomendacao.repository.js";
import {
  resumirRecomendacoes,
  resumirTempos,
  type ItemMetrica,
  type RespostaMetrica,
} from "../../src/integrations/recommendation/recomendacao-volume.metricas.js";

const respostaSchema = z.object({
  estrategia: z.enum(["categoria", "historico-compra", "fallback-geral"]),
  itens: z.array(z.object({ id: z.uuid(), categoriaId: z.uuid() })).max(8),
});

type CacheContagens = { hit: number; miss: number; bypass: number };
type Fase = { tempos: number[]; cache: CacheContagens };
const novaFase = (): Fase => ({
  tempos: [],
  cache: { hit: 0, miss: 0, bypass: 0 },
});

async function iniciarServidor(
  prisma: PrismaClient,
  cacheStore: MemoryCacheStore,
  secret: string,
) {
  const app = createApp(
    prisma,
    { JWT_SECRET: secret, COOKIE_SECURE: false },
    { cacheStore, logCache: () => {} },
  );
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

async function chamada(
  base: string,
  caminho: string,
  cookie: string | undefined,
  esperado: "MISS" | "HIT" | "BYPASS",
  catalogo: Map<string, string>,
) {
  const inicio = performance.now();
  const response = await fetch(`${base}${caminho}`, {
    headers: cookie === undefined ? {} : { Cookie: cookie },
    signal: AbortSignal.timeout(30_000),
  });
  const body: unknown = await response.json();
  const tempo = performance.now() - inicio;
  const result = respostaSchema.safeParse(body);
  if (response.status !== 200 || !result.success)
    throw new Error("Resposta HTTP de recomendacao invalida");
  const cache = response.headers.get("x-cache");
  if (cache !== (esperado === "BYPASS" ? null : esperado))
    throw new Error("Estado HTTP de cache inesperado");
  if (response.headers.get("cache-control") !== "no-store")
    throw new Error("Resposta HTTP permite cache externo");
  const vistos = new Set<string>();
  for (const item of result.data.itens) {
    if (catalogo.get(item.id) !== item.categoriaId || vistos.has(item.id))
      throw new Error("Produto recomendado invalido ou repetido");
    vistos.add(item.id);
  }
  return { resposta: result.data, tempo };
}

function guardarFase(
  fase: Fase,
  tempo: number,
  estado: "hit" | "miss" | "bypass",
) {
  fase.tempos.push(tempo);
  fase.cache[estado] += 1;
}

async function medirEstrategia(
  base: string,
  estrategia: "categoria" | "historico",
  contextos: { id: string; nome?: string }[],
  elegiveis: ItemMetrica[],
  repeticoes: number,
  secret: string,
  cache: MemoryCacheStore,
) {
  const catalogo = new Map(elegiveis.map((p) => [p.id, p.categoriaId]));
  const respostas: RespostaMetrica[] = [];
  const frio = novaFase();
  const quente = novaFase();
  let acertos = 0;
  for (const contexto of contextos) {
    const pessoal = estrategia === "historico";
    const caminho = pessoal
      ? "/recomendacoes/para-mim"
      : `/recomendacoes?produtoId=${contexto.id}`;
    const cookie = pessoal
      ? `origem_sessao=${jwt.sign({ papel: "comprador", nome: contexto.nome }, secret, { subject: contexto.id, expiresIn: "1h" })}`
      : undefined;
    for (let repeticao = 0; repeticao < repeticoes; repeticao += 1) {
      await cache.invalidarPorPrefixo("recomendacoes:");
      const primeira = await chamada(
        base,
        caminho,
        cookie,
        pessoal ? "BYPASS" : "MISS",
        catalogo,
      );
      const segunda = await chamada(
        base,
        caminho,
        cookie,
        pessoal ? "BYPASS" : "HIT",
        catalogo,
      );
      if (
        JSON.stringify(primeira.resposta) !== JSON.stringify(segunda.resposta)
      )
        throw new Error("Respostas fria e quente divergiram");
      if (
        !pessoal &&
        primeira.resposta.itens.some((item) => item.id === contexto.id)
      )
        throw new Error("Produto de contexto recomendado");
      guardarFase(frio, primeira.tempo, pessoal ? "bypass" : "miss");
      guardarFase(quente, segunda.tempo, pessoal ? "bypass" : "hit");
      if (repeticao === 0) {
        respostas.push(primeira.resposta);
        acertos += primeira.resposta.itens.filter(
          (item) => item.categoriaId === catalogo.get(contexto.id),
        ).length;
      }
    }
  }
  const qualidade = resumirRecomendacoes(respostas, elegiveis);
  return {
    estrategia,
    contextos: contextos.length,
    ...qualidade,
    ...(estrategia === "categoria"
      ? {
          acertoCategoria: {
            numerador: acertos,
            denominador: qualidade.totalRecomendacoes,
            percentual:
              qualidade.totalRecomendacoes === 0
                ? 0
                : (acertos * 100) / qualidade.totalRecomendacoes,
          },
        }
      : {}),
    frio: { ...resumirTempos(frio.tempos), cache: frio.cache },
    quente: { ...resumirTempos(quente.tempos), cache: quente.cache },
  };
}

export async function medirBaseRecomendacao(
  prisma: PrismaClient,
  baseNome: "demo" | "volume",
  origem: "seed-isolado" | "branch-configurada",
  repeticoes: number,
) {
  const elegiveis = await prisma.produto.findMany({
    where: {
      ativo: true,
      desativadoPorAdmin: false,
      quantidadeEstoque: { gt: 0 },
      artesao: { ativo: true, papel: "artesao" },
    },
    select: { id: true, categoriaId: true },
    orderBy: { id: "asc" },
  });
  const compradores = await prisma.usuario.findMany({
    where: { ativo: true, papel: "comprador" },
    select: { id: true, nome: true },
    orderBy: { id: "asc" },
  });
  const tamanho = {
    produtos: await prisma.produto.count(),
    produtosElegiveis: elegiveis.length,
    usuarios: await prisma.usuario.count(),
    compradoresAtivos: compradores.length,
    artesaos: await prisma.usuario.count({ where: { papel: "artesao" } }),
    pedidos: await prisma.pedido.count(),
    pedidosConfirmados: await prisma.pedido.count({
      where: { status: "confirmado" },
    }),
    categoriasElegiveis: new Set(elegiveis.map((p) => p.categoriaId)).size,
  };
  const secret = randomBytes(48).toString("base64url");
  const cache = new MemoryCacheStore();
  const server = await iniciarServidor(prisma, cache, secret);
  try {
    const endereco = server.address();
    if (!endereco || typeof endereco === "string")
      throw new Error("Servidor HTTP sem endereco");
    const base = `http://127.0.0.1:${endereco.port}`;
    const estrategias = [
      await medirEstrategia(
        base,
        "categoria",
        elegiveis,
        elegiveis,
        repeticoes,
        secret,
        cache,
      ),
      await medirEstrategia(
        base,
        "historico",
        compradores,
        elegiveis,
        repeticoes,
        secret,
        cache,
      ),
    ];
    return { base: baseNome, origem, tamanho, estrategias };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }
}

export type ReforcoRegional = "on" | "off" | "ambos";

export async function medirReforcoRegional(
  prisma: PrismaClient,
  reforcoRegional: ReforcoRegional,
) {
  const produtos = await prisma.produto.count();
  const elegiveis = await prisma.produto.findMany({
    where: {
      ativo: true,
      desativadoPorAdmin: false,
      quantidadeEstoque: { gt: 0 },
      artesao: { ativo: true, papel: "artesao" },
    },
    select: {
      id: true,
      categoriaId: true,
      artesao: { select: { perfilArtesao: { select: { regiaoId: true } } } },
    },
    orderBy: { id: "asc" },
  });
  const catalogo = new Map(elegiveis.map((p) => [p.id, p]));
  const modos: ("on" | "off")[] =
    reforcoRegional === "ambos" ? ["on", "off"] : [reforcoRegional];
  const resultados = [];
  const proporcao = (numerador: number, denominador: number) => ({
    numerador,
    denominador,
    percentual: denominador === 0 ? 0 : (numerador * 100) / denominador,
  });
  for (const modo of modos) {
    const strategy = new CategoriaRecomendacaoStrategy(
      new PrismaRecomendacaoRepository(prisma),
      modo === "on",
    );
    const respostas: RespostaMetrica[] = [];
    let acertos = 0;
    let mesmaRegiao = 0;
    for (const contexto of elegiveis) {
      const selecao = await strategy.obter({ produtoId: contexto.id });
      const ids = [...new Set(selecao.produtoIds)].filter(
        (id) => id !== contexto.id,
      );
      const itens = ids.flatMap((id) => {
        const candidato = catalogo.get(id);
        if (!candidato) return [];
        if (candidato.categoriaId === contexto.categoriaId) acertos++;
        const regiao = contexto.artesao.perfilArtesao?.regiaoId;
        if (regiao && candidato.artesao.perfilArtesao?.regiaoId === regiao)
          mesmaRegiao++;
        return [{ id, categoriaId: candidato.categoriaId }];
      });
      respostas.push({ estrategia: selecao.estrategia, itens });
    }
    const qualidade = resumirRecomendacoes(respostas, elegiveis);
    resultados.push({
      modo,
      reforcoRegionalAtivo: modo === "on",
      produtos,
      produtosElegiveis: elegiveis.length,
      contextos: elegiveis.length,
      contextosSemRegiao: elegiveis.filter(
        (p) => !p.artesao.perfilArtesao?.regiaoId,
      ).length,
      ...qualidade,
      acertoCategoria: proporcao(acertos, qualidade.totalRecomendacoes),
      mesmaRegiao: proporcao(mesmaRegiao, qualidade.totalRecomendacoes),
    });
  }
  return resultados;
}

export type ResultadoRegional = Awaited<
  ReturnType<typeof medirReforcoRegional>
>[number];
export type ResultadoBase = Awaited<
  ReturnType<typeof medirBaseRecomendacao>
> & { comparacaoRegional?: ResultadoRegional[] };

export function formatarTabelaRegional(resultados: ResultadoRegional[]) {
  return [
    "| Reforco regional | Produtos | Elegiveis | Recomendacoes | Cobertura catalogo % | Cobertura v0 % | Fallback % | Acerto categoria % | Mesma regiao % |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ...resultados.map(
      (r) =>
        `| ${r.modo} | ${r.produtos} | ${r.produtosElegiveis} | ${r.totalRecomendacoes} | ${r.coberturaCatalogo.percentual} | ${r.coberturaContextos.percentual} | ${r.taxaFallback.percentual} | ${r.acertoCategoria.percentual} | ${r.mesmaRegiao.percentual} |`,
    ),
  ].join("\n");
}

export function formatarTabelaMetricas(bases: ResultadoBase[]) {
  const linhas = [
    "| Base | Estrategia | Contextos | Cobertura catalogo % | Cobertura v0 % | Fallback % | Diversidade media | Frio media/p95 ms | Quente media/p95 ms | Cache quente |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---|",
  ];
  for (const base of bases)
    for (const e of base.estrategias)
      linhas.push(
        `| ${base.base} | ${e.estrategia} | ${e.contextos} | ${e.coberturaCatalogo.percentual.toFixed(2)} | ${e.coberturaContextos.percentual.toFixed(2)} | ${e.taxaFallback.percentual.toFixed(2)} | ${e.diversidadeCategorias.mediaPorResposta.toFixed(2)} | ${e.frio.mediaMs}/${e.frio.p95Ms} | ${e.quente.mediaMs}/${e.quente.p95Ms} | ${e.estrategia === "historico" ? "BYPASS" : "HIT"} |`,
      );
  for (const base of bases) {
    if (base.comparacaoRegional) {
      linhas.push(
        "",
        `Comparacao regional: ${base.base}`,
        formatarTabelaRegional(base.comparacaoRegional),
      );
    }
  }
  return linhas.join("\n");
}
