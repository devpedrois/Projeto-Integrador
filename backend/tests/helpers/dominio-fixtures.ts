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
  regiaoId: string,
): Promise<string> {
  const id = await criarUsuarioArtesao(client);
  await client.query('INSERT INTO "PerfilArtesao" ("usuarioId", "regiaoId") VALUES ($1, $2)', [
    id,
    regiaoId,
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
    `INSERT INTO "Produto" ("id", "nome", "descricao", "preco", "artesaoId", "categoriaId", "quantidadeEstoque", "tecnicaId") VALUES ($1, $2, 'Descricao de teste', 10.00, $3, $4, $5, 'tecnica-modelagem-argila')`,
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
