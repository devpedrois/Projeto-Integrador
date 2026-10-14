import "dotenv/config";
import { randomBytes } from "node:crypto";
import type { Server } from "node:http";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { z } from "zod";
import { createApp } from "../src/app.js";
import { criarBancoConcorrencia } from "./helpers/concorrencia-database.js";

const RODADAS = 3;
const TIMEOUT_HTTP_MS = 90_000;

interface Opcoes {
  clientes: number;
  port: number;
}

export interface ResultadoRodada {
  sucessos: number;
  conflitos409: number;
  estoqueFinal: number;
  pedidosProduto: number;
}

class ErroConcorrencia extends Error {}

export function lerOpcoes(args: string[], env: NodeJS.ProcessEnv): Opcoes {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: { clientes: { type: "string" }, port: { type: "string" } },
      allowPositionals: false,
    }));
  } catch {
    throw new ErroConcorrencia(
      "Argumentos invalidos: confira CONCURRENCY_TEST_CLIENTS e CONCURRENCY_TEST_PORT.",
    );
  }
  const clientes = Number(
    values.clientes ?? env.CONCURRENCY_TEST_CLIENTS ?? "50",
  );
  const port = Number(values.port ?? env.CONCURRENCY_TEST_PORT ?? "3910");
  if (!Number.isSafeInteger(clientes) || clientes < 2 || clientes > 100) {
    throw new ErroConcorrencia(
      "CONCURRENCY_TEST_CLIENTS deve ser inteiro entre 2 e 100.",
    );
  }
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new ErroConcorrencia(
      "CONCURRENCY_TEST_PORT deve ser inteiro entre 0 e 65535.",
    );
  }
  return { clientes, port };
}

function identidadeBanco(value: string, nome: string): string {
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
    return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
  } catch {
    throw new ErroConcorrencia(`${nome} invalida.`);
  }
}

export function validarAmbiente(env: NodeJS.ProcessEnv): string {
  if (
    env.NODE_ENV !== undefined &&
    !["development", "test"].includes(env.NODE_ENV)
  ) {
    throw new ErroConcorrencia("NODE_ENV deve ser development ou test.");
  }
  if (!env.DIRECT_URL)
    throw new ErroConcorrencia(
      "DIRECT_URL obrigatoria para a branch de teste.",
    );
  const identity = identidadeBanco(env.DIRECT_URL, "DIRECT_URL");
  if (new URL(env.DIRECT_URL).hostname.includes("-pooler."))
    throw new ErroConcorrencia("DIRECT_URL deve usar conexao direta.");
  if (
    env.DATABASE_URL &&
    identidadeBanco(env.DATABASE_URL, "DATABASE_URL") !== identity
  ) {
    throw new ErroConcorrencia(
      "DATABASE_URL e DIRECT_URL devem apontar para a mesma branch de teste.",
    );
  }
  if (
    env.DATABASE_URL_DEPLOY &&
    identidadeBanco(env.DATABASE_URL_DEPLOY, "DATABASE_URL_DEPLOY") === identity
  ) {
    throw new ErroConcorrencia(
      "DATABASE_URL_DEPLOY nao pode ser a base usada neste teste.",
    );
  }
  return env.DIRECT_URL;
}

export function validarRodada(
  result: ResultadoRodada,
  clientes: number,
): string[] {
  const falhas: string[] = [];
  if (result.sucessos !== 1) falhas.push("Esperado exatamente um sucesso.");
  if (result.conflitos409 !== clientes - 1)
    falhas.push("Esperados N-1 conflitos 409.");
  if (result.estoqueFinal !== 0) falhas.push("Esperado estoque final zero.");
  if (result.estoqueFinal < 0) falhas.push("Estoque negativo.");
  if (result.pedidosProduto !== 1)
    falhas.push("Esperado exatamente um pedido do produto.");
  return falhas;
}

async function post(
  baseUrl: string,
  caminho: string,
  body: unknown,
  cookie?: string,
): Promise<Response> {
  return fetch(`${baseUrl}${caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_HTTP_MS),
  });
}

const usuarioSchema = z.object({ id: z.uuid() });
const pedidoSchema = z.object({
  pedido: z.object({ id: z.uuid(), status: z.literal("confirmado") }),
});
const conflitoSchema = z.object({
  error: z.object({
    code: z.literal("ESTOQUE_INSUFICIENTE"),
    details: z.object({ produtoId: z.uuid(), nome: z.string().min(1) }),
  }),
});

async function cadastrar(
  baseUrl: string,
  email: string,
  senha: string,
  papel: "comprador" | "artesao",
): Promise<string> {
  const response = await post(baseUrl, "/auth/register", {
    nome: "Usuario sintetico concorrencia",
    email,
    senha,
    papel,
  });
  if (response.status !== 201)
    throw new ErroConcorrencia(`Falha no cadastro: HTTP ${response.status}.`);
  const result = usuarioSchema.safeParse(await response.json());
  if (!result.success)
    throw new ErroConcorrencia("Resposta de cadastro invalida.");
  return result.data.id;
}

async function fecharServidor(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeIdleConnections();
  });
}

export async function executarConcorrencia(
  args: string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const options = lerOpcoes(args, env);
  const connectionString = validarAmbiente(env);
  const banco = await criarBancoConcorrencia(connectionString);
  console.log(`Schema temporario: ${banco.schema}`);
  let server: Server | undefined;
  const resumo = {
    compradores: options.clientes,
    cadastros: 0,
    logins: 0,
    schemaRemovido: false,
  };
  const falhas: string[] = [];
  try {
    const app = createApp(banco.prisma, {
      JWT_SECRET: randomBytes(48).toString("hex"),
      COOKIE_SECURE: false,
    });
    server = app.listen(options.port, "127.0.0.1");
    const ativo = server;
    await new Promise<void>((resolve, reject) => {
      ativo.once("listening", resolve);
      ativo.once("error", () =>
        reject(new ErroConcorrencia("CONCURRENCY_TEST_PORT indisponivel.")),
      );
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new ErroConcorrencia("Servidor de teste indisponivel.");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const senha = `Concorrencia!${randomBytes(16).toString("hex")}`;
    const compradores = await Promise.all(
      Array.from({ length: options.clientes }, async (_, indice) => {
        const email = `concorrencia+${indice + 1}@origem.test`;
        const id = await cadastrar(baseUrl, email, senha, "comprador");
        resumo.cadastros += 1;
        const response = await post(baseUrl, "/auth/login", { email, senha });
        if (response.status !== 200)
          throw new ErroConcorrencia(
            `Falha no login: HTTP ${response.status}.`,
          );
        const cookie = response.headers.getSetCookie()[0]?.split(";")[0];
        if (!cookie?.startsWith("origem_sessao="))
          throw new ErroConcorrencia("Cookie de sessao ausente.");
        resumo.logins += 1;
        return { id, cookie };
      }),
    );
    const registrados = await banco.prisma.usuario.count({
      where: {
        id: { in: compradores.map(({ id }) => id) },
        papel: "comprador",
      },
    });
    if (
      registrados !== options.clientes ||
      new Set(compradores.map(({ id }) => id)).size !== options.clientes
    ) {
      throw new ErroConcorrencia(
        "Compradores de teste nao foram persistidos corretamente.",
      );
    }
    console.log(`Compradores sinteticos autenticados: ${registrados}`);
    const artesaoId = await cadastrar(
      baseUrl,
      "concorrencia+artesao@origem.test",
      senha,
      "artesao",
    );
    const categoria = await banco.prisma.categoria.create({
      data: { nome: "Categoria sintetica concorrencia" },
    });
    for (let rodada = 1; rodada <= RODADAS; rodada += 1) {
      const produto = await banco.prisma.produto.create({
        data: {
          nome: `Produto concorrencia rodada ${rodada}`,
          descricao: "Produto sintetico para concorrencia",
          preco: "10.00",
          quantidadeEstoque: 0,
          artesaoId,
          categoriaId: categoria.id,
          tecnicaId: "tecnica-modelagem-argila",
        },
      });
      await banco.prisma.produto.update({
        where: { id: produto.id },
        data: { quantidadeEstoque: 1 },
      });
      const responses = await Promise.all(
        compradores.map(async ({ cookie }) => {
          const response = await post(
            baseUrl,
            "/pedidos",
            { itens: [{ produtoId: produto.id, quantidade: 1 }] },
            cookie,
          );
          const body: unknown = await response.json();
          if (response.status === 201 && !pedidoSchema.safeParse(body).success)
            falhas.push(`Rodada ${rodada}: resposta de pedido invalida.`);
          if (response.status === 409) {
            const result = conflitoSchema.safeParse(body);
            if (
              !result.success ||
              result.data.error.details.produtoId !== produto.id ||
              result.data.error.details.nome !== produto.nome
            )
              falhas.push(`Rodada ${rodada}: conflito de estoque invalido.`);
          }
          return response.status;
        }),
      );
      const rows = await banco.prisma.$queryRaw<
        { quantidadeEstoque: number; pedidosProduto: number }[]
      >`
        SELECT p."quantidadeEstoque",
          (SELECT COUNT(DISTINCT i."pedidoId")::integer FROM "ItemPedido" i WHERE i."produtoId" = p."id") AS "pedidosProduto"
        FROM "Produto" p WHERE p."id" = ${produto.id}::uuid
      `;
      const row = rows[0];
      if (!row)
        throw new ErroConcorrencia("Produto ausente na consulta final.");
      const result: ResultadoRodada = {
        sucessos: responses.filter((status) => status === 201).length,
        conflitos409: responses.filter((status) => status === 409).length,
        estoqueFinal: row.quantidadeEstoque,
        pedidosProduto: row.pedidosProduto,
      };
      console.log(`Rodada ${rodada}: ${JSON.stringify(result)}`);
      falhas.push(
        ...validarRodada(result, options.clientes).map(
          (falha) => `Rodada ${rodada}: ${falha}`,
        ),
      );
    }
  } finally {
    try {
      if (server?.listening) await fecharServidor(server);
    } finally {
      await banco.fechar();
      resumo.schemaRemovido = true;
    }
  }
  console.log(`Resumo: ${JSON.stringify(resumo)}`);
  if (falhas.length > 0) throw new ErroConcorrencia(falhas.join(" "));
  console.log(
    "Concorrencia validada: 3/3 rodadas. Dados sinteticos removidos.",
  );
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  executarConcorrencia().catch((error: unknown) => {
    console.error(
      error instanceof ErroConcorrencia
        ? error.message
        : "Falha no teste de concorrencia.",
    );
    process.exitCode = 1;
  });
}
