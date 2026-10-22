import "dotenv/config";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { criarBancoAuth } from "../helpers/auth-database.js";
import { runVolumeSeed } from "../../prisma/seed-volume.js";

describe("BD.2: HTTP com PostgreSQL real", () => {
  it("mede seis cenarios sem cache e salva CSV e planos reais", async () => {
    const { executarBuscaBenchmark, parseBuscaOptions } =
      await import("../../scripts/busca-p95.js");
    const database = await criarBancoAuth();
    try {
      const rows = await database.prisma.$queryRaw<
        { schema: string }[]
      >`SELECT current_schema() AS schema`;
      const schema = rows[0]?.schema;
      if (!schema || !/^web03_[a-f0-9]{32}$/.test(schema))
        throw new Error("Schema isolado ausente");
      const output = await mkdtemp(join(tmpdir(), "origem-bd2-"));
      const options = parseBuscaOptions([
        "--schema",
        schema,
        "--output",
        output,
      ]);
      const env = {
        ...process.env,
        NODE_ENV: "test",
        DATABASE_URL_VOLUME: process.env.DIRECT_URL,
      };
      await expect(executarBuscaBenchmark(options, env)).rejects.toThrow(
        "pelo menos 1000 produtos",
      );
      await runVolumeSeed(database.prisma);
      const resultado = await executarBuscaBenchmark(options, env);
      expect(resultado.cenarios.map((item) => item.cenario)).toEqual([
        "sem-filtro",
        "termo",
        "categoria",
        "tecnica",
        "regiao",
        "combinado",
      ]);
      for (const cenario of resultado.cenarios) {
        expect(cenario.amostras).toBe(30);
        expect(cenario.p50Ms).toBeGreaterThan(0);
        expect(cenario.p95Ms).toBeGreaterThanOrEqual(cenario.p50Ms);
        expect(cenario.maxMs).toBeGreaterThanOrEqual(cenario.p95Ms);
      }
      const csv = await readFile(join(output, "bruto.csv"), "utf8");
      const linhas = csv.trim().split(/\r?\n/);
      expect(linhas).toHaveLength(211);
      expect(linhas[0]).toBe(
        "cenario,fase,repeticao,tempo_ms,status_http,cache,itens",
      );
      for (const nome of [
        "sem-filtro",
        "termo",
        "categoria",
        "tecnica",
        "regiao",
        "combinado",
      ]) {
        const cenario = linhas
          .slice(1)
          .filter((linha) => linha.startsWith(`${nome},`));
        expect(
          cenario.filter((linha) => linha.includes(",aquecimento,")),
        ).toHaveLength(5);
        expect(
          cenario.filter((linha) => linha.includes(",medicao,")),
        ).toHaveLength(30);
        for (const linha of cenario) {
          const colunas = linha.split(",");
          expect(colunas[4]).toBe("200");
          expect(colunas[5]).toBe("MISS");
          expect(Number(colunas[6])).toBeGreaterThan(0);
        }
      }
      const planos = await readdir(join(output, "explain-http"));
      expect(planos).toHaveLength(6);
      for (const nome of planos) {
        const plano = JSON.parse(
          await readFile(join(output, "explain-http", nome), "utf8"),
        );
        expect(plano.consultas.length).toBeGreaterThan(0);
        expect(
          plano.consultas[0].explain[0].Plan["Actual Rows"],
        ).toBeGreaterThan(0);
        expect(plano.consultas[0].explain[0]["Execution Time"]).toBeTypeOf(
          "number",
        );
      }
      const metadata = JSON.parse(
        await readFile(join(output, "resultado.json"), "utf8"),
      );
      expect(metadata.contexto).toMatchObject({
        produtos: 1000,
        somenteLeitura: true,
        enableSeqscan: "on",
      });
      expect(await readFile(join(output, "resumo.md"), "utf8")).toContain(
        "p50 ms | p95 ms | Max ms",
      );
      const antes = await readFile(join(output, "bruto.csv"), "utf8");
      await expect(executarBuscaBenchmark(options, env)).rejects.toThrow(
        "saida precisa estar vazio",
      );
      expect(await readFile(join(output, "bruto.csv"), "utf8")).toBe(antes);
      expect(await database.prisma.produto.count()).toBe(1000);
    } finally {
      await database.fechar();
    }
  }, 120_000);
});
