import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { conexaoLocal, verificarD11 } from "../../scripts/bd-av2-validar.js";

const cabecalho = "-- Origem AV2. Requer PostgreSQL 13 ou superior.\n";

describe("limites do validador BD AV2", () => {
  it("aceita somente a porta e as credenciais da URL local", () => {
    const config = conexaoLocal("postgresql://autor:p%40ss@LOCALHOST:6543/av2");
    expect(config).toMatchObject({
      host: "127.0.0.1",
      port: 6543,
      user: "autor",
      password: "p@ss",
      database: "av2",
    });
  });

  it.each([
    undefined,
    "invalida",
    "postgresql://autor@teste.neon.tech/base",
    "postgresql://autor@teste.render.com/base",
    "postgresql://autor@outro.invalid/base",
    "postgresql://autor@127.0.0.1/base?host=outro.invalid",
    "postgresql://autor@localhost/base?service=externo",
    "postgresql://autor@localhost:0/base",
    "https://autor@localhost/base",
  ])("recusa destino ausente, remoto ou ambíguo", (url) => {
    expect(() => conexaoLocal(url)).toThrow();
  });

  it("omite usuário, senha, host remoto e URL do diagnóstico", () => {
    expect(() =>
      conexaoLocal("postgresql://marca:sentinela@privado.neon.tech/base"),
    ).toThrow(/^BD_AV2_DATABASE_URL recusada\.$/);
  });

  it("rejeita metacomando e CREATE EXTENSION no mesmo arquivo", async () => {
    const arquivo = new URL(
      "../fixtures/bd-av2-d11-invalido.sql",
      import.meta.url,
    );
    expect(verificarD11(await readFile(arquivo, "utf8"))).toEqual(
      expect.arrayContaining(["metacomando psql", "CREATE EXTENSION"]),
    );
  });

  it.each([
    ["\uFEFF" + cabecalho, "BOM UTF-8"],
    ["-- Sem versão\nSELECT 'PostgreSQL 13';", "cabeçalho PostgreSQL 13"],
    [cabecalho + "SELECT :nome", "variável psql"],
    [cabecalho + "SELECT :'nome'", "variável psql"],
    [cabecalho + 'SELECT :"nome"', "variável psql"],
    [cabecalho + "SELECT :{?nome}", "variável psql"],
    [cabecalho + "SELECT região", "identificador não ASCII"],
    [cabecalho + 'SELECT "região"', "identificador não ASCII"],
    [cabecalho + 'SELECT U&"regi\\00E3o"', "identificador não ASCII"],
    [cabecalho + 'SELECT "produto🌱"', "identificador não ASCII"],
  ])("identifica violações de portabilidade", (sql, erro) => {
    expect(verificarD11(sql)).toContain(erro);
  });

  it("preserva casts, comentários, dados e regex SQL", () => {
    const sql =
      cabecalho +
      "/* comentário /* seção */ final */\nSELECT ':região; CREATE EXTENSION'::text, '^[^@\\s]+$';";
    expect(verificarD11(sql)).toEqual([]);
  });
});
