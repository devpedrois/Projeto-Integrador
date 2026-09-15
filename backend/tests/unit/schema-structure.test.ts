import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const schemaPath = fileURLToPath(
  new URL("../../prisma/schema.prisma", import.meta.url),
);
const schema = readFileSync(schemaPath, "utf8");

function modelBlock(name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (match === null) {
    throw new Error(`model ${name} not found in schema.prisma`);
  }
  return match[1] ?? "";
}

describe("complete domain schema structure", () => {
  const dominioEntities = [
    "Usuario",
    "PerfilArtesao",
    "Categoria",
    "Produto",
    "ProdutoFoto",
    "Carrinho",
    "ItemCarrinho",
    "Pedido",
    "ItemPedido",
    "Pagamento",
    "Avaliacao",
  ];

  it.each(dominioEntities)("declares the %s domain model", (name) => {
    expect(schema).toMatch(new RegExp(`model ${name} \\{`));
  });

  it("keeps queue infrastructure under its own clearly named model", () => {
    expect(schema).toMatch(/model IntencaoNotificacao \{/);
    expect(dominioEntities).not.toContain("IntencaoNotificacao");
  });

  it.each([
    ["PapelUsuario", ["comprador", "artesao", "admin"]],
    ["StatusPedido", ["pendente", "confirmado", "cancelado"]],
    ["MetodoPagamento", ["pix_simulado"]],
    ["StatusPagamento", ["aprovado", "recusado"]],
    ["StatusIntencao", ["pendente", "publicada", "processada", "falha"]],
  ] as const)("declares enum %s with its expected values", (name, values) => {
    const match = schema.match(new RegExp(`enum ${name} \\{([\\s\\S]*?)\\n\\}`));
    expect(match).not.toBeNull();
    const body = match?.[1] ?? "";
    for (const value of values) {
      expect(body).toMatch(new RegExp(`\\b${value}\\b`));
    }
  });

  it("preserves the reduced FCCPD fields already relied on by services and tests", () => {
    expect(modelBlock("Produto")).toMatch(/nome\s+String/);
    expect(modelBlock("Produto")).toMatch(/quantidadeEstoque\s+Int\b/);
    expect(modelBlock("Pedido")).toMatch(/compradorRef\s+String\b/);
    expect(modelBlock("ItemPedido")).toMatch(/quantidade\s+Int\b/);
  });

  it("plans the compradorRef to Usuario transition without dropping the synthetic field", () => {
    const pedido = modelBlock("Pedido");
    expect(pedido).toMatch(/compradorRef\s+String\b/);
    expect(pedido).toMatch(/compradorId\s+String\?\s+@db\.Uuid/);
    expect(pedido).toMatch(/comprador\s+Usuario\?\s+@relation/);
  });

  it("uses UUID identifiers on every domain model", () => {
    for (const name of dominioEntities) {
      const block = modelBlock(name);
      expect(block).toMatch(/@db\.Uuid/);
    }
  });

  it("uses Decimal for monetary fields", () => {
    expect(modelBlock("Produto")).toMatch(/preco\s+Decimal\?\s+@db\.Decimal\(10,\s*2\)/);
    expect(modelBlock("ItemCarrinho")).toMatch(
      /precoUnitario\s+Decimal\s+@db\.Decimal\(10,\s*2\)/,
    );
    expect(modelBlock("ItemPedido")).toMatch(
      /precoUnitario\s+Decimal\?\s+@db\.Decimal\(10,\s*2\)/,
    );
    expect(modelBlock("Pagamento")).toMatch(/valor\s+Decimal\s+@db\.Decimal\(10,\s*2\)/);
  });

  it("uses timezone-aware timestamps for creation dates", () => {
    expect(modelBlock("Usuario")).toMatch(/criadoEm\s+DateTime\s+@default\(now\(\)\)\s+@db\.Timestamptz/);
    expect(modelBlock("Avaliacao")).toMatch(/criadoEm\s+DateTime\s+@default\(now\(\)\)\s+@db\.Timestamptz/);
  });

  it("marks Usuario email as unique", () => {
    expect(modelBlock("Usuario")).toMatch(/email\s+String\s+@unique/);
  });

  it("never cascades deletes over order history relations", () => {
    const itemPedido = modelBlock("ItemPedido");
    expect(itemPedido).toMatch(/pedido\s+Pedido\s+@relation\([^)]*onDelete:\s*Restrict/);
    expect(itemPedido).toMatch(/produto\s+Produto\s+@relation\([^)]*onDelete:\s*Restrict/);
    const pagamento = modelBlock("Pagamento");
    expect(pagamento).toMatch(/pedido\s+Pedido\s+@relation\([^)]*onDelete:\s*Restrict/);
  });

  it("allows at most one payment per order", () => {
    expect(modelBlock("Pagamento")).toMatch(/pedidoId\s+String\s+@unique\s+@db\.Uuid/);
  });

  it("prevents duplicate cart lines for the same product", () => {
    expect(schema).toMatch(/@@unique\(\[carrinhoId,\s*produtoId\]\)/);
  });

  it("prevents duplicate reviews from the same buyer for the same product", () => {
    expect(modelBlock("Avaliacao")).toMatch(/nota\s+Int\b/);
    expect(schema).toMatch(/@@unique\(\[compradorId,\s*produtoId\]\)/);
  });
});
