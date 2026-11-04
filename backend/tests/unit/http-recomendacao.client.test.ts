import { createServer, type Server, type RequestListener } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { HttpRecomendacaoClient } from "../../src/integrations/recommendation/http-recomendacao.client.js";
import { RecomendacaoIndisponivelError } from "../../src/errors/recomendacao-indisponivel.error.js";
import fixture from "../../../fixtures/recomendacao-selecao.fixture.json" with { type: "json" };

const token = "synthetic-service-token-with-at-least-32-characters";
const servers: Server[] = [];
async function serve(listener: RequestListener) {
  const server = createServer(listener);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta ausente");
  return `http://127.0.0.1:${address.port}`;
}
const client = (url: string, timeout = 800) =>
  new HttpRecomendacaoClient({
    RECOMENDACAO_URL: url,
    RECOMENDACAO_SERVICE_TOKEN: token,
    RECOMENDACAO_TIMEOUT_MS: timeout,
  });
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        }),
    ),
  );
});

describe("HttpRecomendacaoClient", () => {
  it.each([
    [{}, "/recomendacoes"],
    [
      { produtoId: fixture.produtoIds[0] as string },
      `/recomendacoes?produtoId=${fixture.produtoIds[0]}`,
    ],
    [
      { usuarioId: fixture.produtoIds[1] as string },
      `/recomendacoes/historico?usuarioId=${fixture.produtoIds[1]}`,
    ],
  ] as const)(
    "envia contexto e token ao endpoint correto: %j",
    async (contexto, path) => {
      const url = await serve((req, res) => {
        expect(req.method).toBe("GET");
        expect(req.url).toBe(path);
        expect(req.headers["x-service-token"]).toBe(token);
        expect(req.headers.authorization).toBeUndefined();
        res.end(JSON.stringify(fixture));
      });
      expect(await client(url).obter(contexto)).toEqual(fixture);
    },
  );

  it.each([201, 204, 301, 401, 500, 503])(
    "classifica status %s sem retry",
    async (status) => {
      let calls = 0;
      const url = await serve((_req, res) => {
        calls++;
        res.writeHead(status, { Location: "/outro" });
        res.end();
      });
      await expect(client(url).obter({})).rejects.toMatchObject({
        motivo: "status",
      });
      expect(calls).toBe(1);
    },
  );

  it.each([
    "invalid-json",
    "null",
    "{}",
    JSON.stringify({ ...fixture, produtoIds: ["invalido"] }),
    JSON.stringify({
      ...fixture,
      produtoIds: Array(9).fill(fixture.produtoIds[0]),
    }),
    JSON.stringify({ ...fixture, estrategia: "desconhecida" }),
    JSON.stringify({ ...fixture, token }),
  ])("rejeita resposta invalida sem revelar corpo", async (body) => {
    const url = await serve((_req, res) => res.end(body));
    const error = await client(url)
      .obter({})
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(RecomendacaoIndisponivelError);
    expect(error).toMatchObject({ motivo: "resposta-invalida" });
    expect(String(error)).not.toContain(token);
  });

  it("aborta resposta lenta inclusive durante a leitura do corpo", async () => {
    let calls = 0;
    const url = await serve((_req, res) => {
      calls++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"estrategia":');
    });
    await expect(client(url, 100).obter({})).rejects.toMatchObject({
      motivo: "timeout",
    });
    expect(calls).toBe(1);
  });

  it("classifica servidor desligado como rede", async () => {
    const url = await serve((_req, res) => res.end());
    const server = servers[0];
    if (!server) throw new Error("Servidor ausente");
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await expect(client(url).obter({})).rejects.toMatchObject({
      motivo: "rede",
    });
  });

  it("classifica conexao interrompida durante o corpo como rede", async () => {
    const url = await serve((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"estrategia":');
      setTimeout(() => res.destroy(), 20);
    });
    await expect(client(url).obter({})).rejects.toMatchObject({
      motivo: "rede",
    });
  });
});
