import { Agent, get } from "node:http";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import jwt from "jsonwebtoken";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runVolumeSeed } from "../../prisma/seed-volume.js";
import { gerarVolume } from "../../prisma/seeds/volume.js";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { iniciarPostgresIndicadores } from "../helpers/postgres-indicadores-local.js";
import { iniciarServidorIndicadores } from "../helpers/servidor-indicadores-medicao.js";

describe.runIf(process.env.EVIDENCIA_INDICADORES === "1")(
  "HTTP completo dos indicadores",
  () => {
    let banco: Awaited<ReturnType<typeof criarBancoAuth>>;
    let postgres: Awaited<ReturnType<typeof iniciarPostgresIndicadores>>;
    let api: Awaited<ReturnType<typeof iniciarServidorIndicadores>>;
    let origem: string;
    let sessao: string;
    let artesaoId: string;
    const agent = new Agent({ keepAlive: true, maxSockets: 1 });

    beforeAll(async () => {
      const databaseUrl = process.env.CACHE_BENCH_DATABASE_URL;
      if (!databaseUrl) postgres = await iniciarPostgresIndicadores();
      banco = await criarBancoAuth(databaseUrl ?? postgres.databaseUrl);
      await banco.prisma.$transaction((tx) => runVolumeSeed(tx), {
        timeout: 120000,
      });
      const artesao = gerarVolume().artesaos[0];
      if (!artesao) throw new Error("Artesao da massa de volume ausente");
      artesaoId = artesao.id;
      const secret = randomUUID();
      sessao = `origem_sessao=${jwt.sign({ papel: "artesao", nome: "Pessoa sintetica" }, secret, { subject: artesaoId, expiresIn: "1h" })}`;
      api = await iniciarServidorIndicadores({
        databaseUrl: databaseUrl ?? postgres.databaseUrl,
        schema: banco.schema,
        secret,
      });
      origem = api.origem;
    }, 120000);

    afterAll(async () => {
      agent.destroy();
      await api?.fechar();
      try {
        await banco?.fechar();
      } finally {
        await postgres?.fechar();
      }
    });

    async function consultar() {
      const inicio = performance.now();
      return new Promise<{
        status: number;
        cache: string | undefined;
        serverTiming: string | undefined;
        cacheControl: string | undefined;
        httpMs: number;
        corpo: unknown;
      }>((resolve, reject) => {
        const req = get(
          `${origem}/artesao/indicadores`,
          { agent, headers: { Cookie: sessao } },
          (response) => {
            const blocos: Buffer[] = [];
            response.on("data", (bloco: Buffer) => {
              blocos.push(bloco);
            });
            response.once("error", reject);
            response.once("end", () => {
              try {
                const corpo: unknown = JSON.parse(
                  Buffer.concat(blocos).toString("utf8"),
                );
                const valor = (nome: string) => {
                  const h = response.headers[nome];
                  return typeof h === "string" ? h : undefined;
                };
                resolve({
                  status: response.statusCode ?? 0,
                  cache: valor("x-cache"),
                  serverTiming: valor("server-timing"),
                  cacheControl: valor("cache-control"),
                  httpMs: performance.now() - inicio,
                  corpo,
                });
              } catch {
                reject(new Error("Resposta HTTP de medicao invalida"));
              }
            });
          },
        );
        req.once("error", reject);
        req.setTimeout(60000, () => {
          req.destroy(new Error("HTTP de medicao expirou"));
        });
      });
    }

    it("reduz em pelo menos cinquenta por cento a media HTTP de dez pares no volume", async () => {
      const contagens = {
        produtos: await banco.prisma.produto.count(),
        pedidos: await banco.prisma.pedido.count(),
        itens: await banco.prisma.itemPedido.count(),
      };
      const [identidade] = await banco.prisma.$queryRaw<
        { banco: string; versao: string }[]
      >`SELECT current_database() AS banco, version() AS versao`;
      expect(identidade?.banco).toBe("origem_cache_324");
      expect(contagens).toEqual({ produtos: 1000, pedidos: 1500, itens: 1550 });
      for (let aquecimento = 0; aquecimento < 10; aquecimento++) {
        await api.invalidar(artesaoId);
        await consultar();
        await consultar();
      }
      const pares = [];
      for (let indice = 0; indice < 10; indice++) {
        await api.invalidar(artesaoId);
        const miss = await consultar();
        const hit = await consultar();
        expect(miss.status).toBe(200);
        expect(hit.status).toBe(200);
        expect(miss.cache).toBe("MISS");
        expect(hit.cache).toBe("HIT");
        expect(hit.corpo).toEqual(miss.corpo);
        expect(miss.cacheControl).toBe("no-store");
        expect(hit.cacheControl).toBe("no-store");
        pares.push({
          par: indice + 1,
          miss: {
            status: miss.status,
            cache: miss.cache,
            cacheControl: miss.cacheControl,
            corpo: miss.corpo,
          },
          hit: {
            status: hit.status,
            cache: hit.cache,
            cacheControl: hit.cacheControl,
            corpo: hit.corpo,
          },
          missHttpMs: miss.httpMs,
          hitHttpMs: hit.httpMs,
          missServerTiming: miss.serverTiming,
          hitServerTiming: hit.serverTiming,
          reducaoHttpPercentual: (1 - hit.httpMs / miss.httpMs) * 100,
        });
      }
      const mediaMissMs =
        pares.reduce((soma, p) => soma + p.missHttpMs, 0) / pares.length;
      const mediaHitMs =
        pares.reduce((soma, p) => soma + p.hitHttpMs, 0) / pares.length;
      await api.fechar();
      const logs = api.logs.slice(-20);
      expect(logs).toHaveLength(20);
      const resultado = {
        capturadoEm: new Date().toISOString(),
        ambiente:
          "API em processo separado; HTTP keep-alive em loopback; PostgreSQL Docker local; schema sintetico isolado",
        runtime: { plataforma: process.platform, node: process.version },
        imagem: "postgres:16",
        postgres: identidade?.versao,
        metodo:
          "HTTP completo ate interpretar JSON; autenticacao incluida; dez pares de aquecimento MISS/HIT; dez pares medidos sem descarte; comparacao das medias aritmeticas",
        contagens,
        pares,
        mediaMissMs,
        mediaHitMs,
        reducaoHttpPercentual: (1 - mediaHitMs / mediaMissMs) * 100,
        logs,
      };
      if (process.env.EVIDENCIA_INDICADORES === "1") {
        const destino = new URL(
          `../../../evidencias/PI4-32/32.4-cache-indicadores/${randomUUID()}/`,
          import.meta.url,
        );
        await mkdir(destino, { recursive: true });
        await writeFile(
          new URL("http-volume.json", destino),
          JSON.stringify(resultado, null, 2) + "\n",
          { flag: "wx" },
        );
        console.log(`EVIDENCIA_HTTP_INDICADORES=${destino.pathname}`);
      }
      expect(pares).toHaveLength(10);
      expect(mediaHitMs).toBeLessThanOrEqual(mediaMissMs * 0.5);
    }, 60000);
  },
);
