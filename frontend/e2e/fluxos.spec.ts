import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

const produto = "Boneca de Barro Pintada";

async function login(page: Page, email: string, senha: string, destino = "/") {
  await page.goto(`/login?retorno=${encodeURIComponent(destino)}`);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`${destino === "/" ? "/" : destino}$`),
  );
}

async function comprar(page: Page) {
  const email = `e2e31-${randomUUID()}@teste.origem`;
  const senha = `E2e!${randomUUID()}`;
  await test.step("Cadastro e login do comprador novo", async () => {
    await page.goto("/cadastro");
    await page
      .getByLabel("Nome", { exact: true })
      .fill("Comprador sintético E2E");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(senha);
    await page.getByRole("radio", { name: "Comprador", exact: true }).click();
    const cadastro = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/auth/register" &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
    expect((await cadastro).status()).toBe(201);
    await expect(page).toHaveURL(/\/login\?cadastro=sucesso$/);
    await login(page, email, senha);
  });
  await test.step("Busca com filtro e detalhe do produto", async () => {
    await page
      .getByRole("searchbox", { name: "Buscar produtos" })
      .fill("Boneca");
    await expect(page).toHaveURL(/termo=Boneca/);
    if ((page.viewportSize()?.width ?? 1280) < 1024)
      await page.getByRole("button", { name: "Filtros", exact: true }).click();
    const filtrada = page.waitForResponse((r) => {
      const url = new URL(r.url());
      return (
        url.pathname === "/api/produtos" &&
        url.searchParams.get("termo") === "Boneca" &&
        url.searchParams.has("categoriaId")
      );
    });
    await page
      .getByLabel("Categoria", { exact: true })
      .selectOption({ label: "Cerâmica e Barro" });
    const respostaFiltro = await filtrada;
    expect(respostaFiltro.status()).toBe(200);
    const categoriaId = await page
      .getByLabel("Categoria", { exact: true })
      .inputValue();
    const lista: { categoriaId: string }[] = await respostaFiltro.json();
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((item) => item.categoriaId === categoriaId)).toBe(true);
    await expect(page.getByLabel("Categoria", { exact: true })).not.toHaveValue(
      "",
    );
    if ((page.viewportSize()?.width ?? 1280) < 1024)
      await page
        .getByRole("button", { name: "Fechar filtros", exact: true })
        .click();
    const resultados = page.getByRole("region", { name: "Resultado da busca" });
    await resultados.getByRole("link", { name: produto, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: produto, exact: true, level: 1 }),
    ).toBeVisible();
  });
  await test.step("Carrinho e checkout pela API real", async () => {
    const adicionado = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/carrinho/itens" &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
      .first()
      .click();
    expect((await adicionado).ok()).toBe(true);
    await page
      .getByRole("link", { name: /^Carrinho/ })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Seu carrinho", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toContainText(produto);
    await page
      .getByRole("link", { name: "Finalizar compra", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Revisar e confirmar pedido" }),
    ).toBeVisible();
  });
  const criado = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/pedidos" &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  const resposta = await criado;
  expect(resposta.status()).toBe(201);
  const body: { pedido: { numero: string } } = await resposta.json();
  const numero = body.pedido.numero;
  expect(numero).toMatch(/^ORG-\d{4}-\d+$/);
  await expect(
    page.getByRole("heading", { name: "Pedido confirmado", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toContainText(numero);
  await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meus pedidos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Ver pedido ${numero}`, exact: true })
    .click();
  const detalhe = page.getByRole("region", { name: "Detalhe do pedido" });
  await expect(
    detalhe.getByRole("heading", { name: numero, exact: true }),
  ).toBeVisible();
  await expect(detalhe).toContainText("Aguardando envio");
  return numero;
}

test("(a) cadastro ate Meus pedidos com numero confirmado", async ({
  page,
}) => {
  await comprar(page);
});

test("(b) artesao envia e comprador acompanha Enviado", async ({
  page,
  context,
}) => {
  const numero = await comprar(page);
  const artesao = await context.browser()!.newContext({
    viewport: page.viewportSize(),
    baseURL: test.info().project.use.baseURL,
  });
  try {
    const painel = await artesao.newPage();
    await login(
      painel,
      "joao.artesao@origem.test",
      "senha-sintetica-artesao",
      "/painel-artesao/pedidos",
    );
    await expect(
      painel.getByRole("heading", { name: "Pedidos recebidos", exact: true }),
    ).toBeVisible();
    const pedido = painel.getByRole("listitem").filter({
      has: painel.getByRole("heading", { name: numero, exact: true }),
    });
    await pedido
      .getByRole("button", { name: "Marcar como enviado", exact: true })
      .click();
    const enviado = painel.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.endsWith("/enviar") &&
        r.request().method() === "PATCH",
    );
    await pedido
      .getByRole("button", { name: "Confirmar envio", exact: true })
      .click();
    expect((await enviado).status()).toBe(200);
    await expect(pedido).toContainText("Enviado");
    await page
      .getByRole("button", { name: "Atualizar pedido", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Detalhe do pedido" }),
    ).toContainText("Enviado");
  } finally {
    await artesao.close();
  }
});
