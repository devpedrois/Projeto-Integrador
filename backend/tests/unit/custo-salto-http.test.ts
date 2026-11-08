import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

const carregar = () => import("../../scripts/custo-salto-http.js");
const ids = Array.from(
  { length: 10 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((done) => {
          server.close(() => done());
          server.closeAllConnections();
        }),
    ),
  );
});

async function endpoint(mode = "valido") {
  const recebidos: string[] = [];
  const server = createServer((request, response) => {
    recebidos.push(
      new URL(request.url ?? "/", "http://localhost").searchParams.get(
        "produtoId",
      ) ?? "",
    );
    response.setHeader("X-Cache", mode === "cache" ? "HIT" : "MISS");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json");
    response.statusCode = mode === "http" ? 503 : 200;
    response.end(
      JSON.stringify({
        estrategia: mode === "fallback" ? "fallback-local" : "categoria",
        itens: mode === "vazio" ? [] : [{ id: ids[9] }],
      }),
    );
  });
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta ausente");
  return { base: `http://127.0.0.1:${address.port}`, recebidos };
}

describe("35.8: custo do salto HTTP", () => {
  it("usa nearest-rank sem remover o maior tempo", async () => {
    const { resumirSalto } = await carregar();
    expect(resumirSalto(Array.from({ length: 30 }, (_, i) => i + 1))).toEqual({
      amostras: 30,
      p50Ms: 15,
      p95Ms: 29,
      maxMs: 30,
    });
    expect(() => resumirSalto(Array(29).fill(1))).toThrow();
    expect(() => resumirSalto([...Array<number>(29).fill(1), NaN])).toThrow();
  });

  it("registra cinco aquecimentos e tres ciclos dos mesmos produtos", async () => {
    const { medirConfiguracao } = await carregar();
    const { base, recebidos } = await endpoint();
    const amostras: unknown[] = [];
    let invalidacoes = 0;
    await medirConfiguracao({
      base,
      configuracao: "A",
      produtoIds: ids,
      invalidar: async () => {
        invalidacoes += 1;
      },
      registrar: async (amostra) => {
        amostras.push(amostra);
      },
    });
    expect(invalidacoes).toBe(35);
    expect(recebidos.slice(0, 5)).toEqual(ids.slice(0, 5));
    expect(recebidos.slice(5)).toEqual([...ids, ...ids, ...ids]);
    expect(amostras).toHaveLength(35);
    expect(amostras.slice(5)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fase: "medicao",
          valida: true,
          cache: "MISS",
        }),
      ]),
    );
  });

  it.each(["cache", "fallback", "vazio", "http"])(
    "registra falha %s e interrompe sem substituir amostras",
    async (mode) => {
      const { medirConfiguracao } = await carregar();
      const { base, recebidos } = await endpoint(mode);
      const amostras: unknown[] = [];
      await expect(
        medirConfiguracao({
          base,
          configuracao: "B",
          produtoIds: ids,
          invalidar: async () => {},
          registrar: async (amostra) => {
            amostras.push(amostra);
          },
        }),
      ).rejects.toThrow();
      expect(recebidos).toHaveLength(1);
      expect(amostras).toEqual([expect.objectContaining({ valida: false })]);
    },
  );

  it("recusa contextos repetidos antes do HTTP", async () => {
    const { medirConfiguracao } = await carregar();
    await expect(
      medirConfiguracao({
        base: "http://127.0.0.1:1",
        configuracao: "A",
        produtoIds: Array<string>(10).fill(
          "00000000-0000-4000-8000-000000000001",
        ),
        invalidar: async () => {},
        registrar: async () => {},
      }),
    ).rejects.toThrow();
  });

  it("recusa volume igual ao desenvolvimento ou deploy", async () => {
    const { validarVolume } = await carregar();
    const volume = "postgresql://synthetic:synthetic@volume.example/origem";
    expect(validarVolume({ DATABASE_URL_VOLUME: volume })).toBe(volume);
    expect(() =>
      validarVolume({ DATABASE_URL_VOLUME: volume, DATABASE_URL: volume }),
    ).toThrow();
    expect(() =>
      validarVolume({
        DATABASE_URL_VOLUME: volume,
        DATABASE_URL_DEPLOY: volume,
      }),
    ).toThrow();
    expect(() =>
      validarVolume({ DATABASE_URL_VOLUME: volume, NODE_ENV: "production" }),
    ).toThrow();
  });
});
