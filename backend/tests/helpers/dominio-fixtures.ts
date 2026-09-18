import { randomUUID } from "node:crypto";

interface Queryable {
  query: (text: string, values?: unknown[]) => Promise<unknown>;
}

export async function criarUsuarioArtesao(client: Queryable): Promise<string> {
  const id = randomUUID();
  await client.query(
    'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "papel") VALUES ($1, $2, $3, $4, $5)',
    [id, "Artesao de teste", `artesao-${id}@teste.origem`, "hash-de-teste", "artesao"],
  );
  return id;
}

export async function criarUsuarioArtesaoComRegiao(
  client: Queryable,
  regiao: string,
): Promise<string> {
  const id = await criarUsuarioArtesao(client);
  await client.query('INSERT INTO "PerfilArtesao" ("usuarioId", "regiao") VALUES ($1, $2)', [
    id,
    regiao,
  ]);
  return id;
}

export async function criarUsuarioComprador(client: Queryable): Promise<string> {
  const id = randomUUID();
  await client.query(
    'INSERT INTO "Usuario" ("id", "nome", "email", "senhaHash", "papel") VALUES ($1, $2, $3, $4, $5)',
    [id, "Comprador de teste", `comprador-${id}@teste.origem`, "hash-de-teste", "comprador"],
  );
  return id;
}

export async function criarCategoria(client: Queryable): Promise<string> {
  const id = randomUUID();
  await client.query('INSERT INTO "Categoria" ("id", "nome") VALUES ($1, $2)', [
    id,
    `Categoria de teste ${id}`,
  ]);
  return id;
}

export async function criarProduto(
  client: Queryable,
  options: { artesaoId: string; categoriaId: string; quantidadeEstoque?: number },
): Promise<string> {
  const id = randomUUID();
  await client.query(
    'INSERT INTO "Produto" ("id", "nome", "artesaoId", "categoriaId", "quantidadeEstoque") VALUES ($1, $2, $3, $4, $5)',
    [
      id,
      "Produto de teste",
      options.artesaoId,
      options.categoriaId,
      options.quantidadeEstoque ?? 1,
    ],
  );
  return id;
}

export async function criarPedido(
  client: Queryable,
  options: { compradorId: string; compradorRef?: string },
): Promise<string> {
  const id = randomUUID();
  await client.query(
    'INSERT INTO "Pedido" ("id", "compradorRef", "compradorId") VALUES ($1, $2, $3)',
    [id, options.compradorRef ?? `comprador-ref-${id}`, options.compradorId],
  );
  return id;
}
