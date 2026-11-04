# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxos.spec.ts >> (a) cadastro autenticado ate Meus pedidos sem login separado
- Location: e2e\fluxos.spec.ts:167:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.fill: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByLabel('Nome', { exact: true })

```

# Test source

```ts
  1   | import { randomUUID } from "node:crypto";
  2   | import { test, expect, type Page, type Request } from "@playwright/test";
  3   | 
  4   | const produto = "Boneca de Barro Pintada";
  5   | 
  6   | async function login(page: Page, email: string, senha: string, destino = "/") {
  7   |   await page.goto(`/login?retorno=${encodeURIComponent(destino)}`);
  8   |   await page.getByLabel("E-mail", { exact: true }).fill(email);
  9   |   await page.getByLabel("Senha", { exact: true }).fill(senha);
  10  |   await page.getByRole("button", { name: "Entrar", exact: true }).click();
  11  |   await expect(page).toHaveURL(
  12  |     new RegExp(`${destino === "/" ? "/" : destino}$`),
  13  |   );
  14  | }
  15  | 
  16  | async function cadastrar(page: Page, papel: "comprador" | "artesao") {
  17  |   const email = `e2e31-${randomUUID()}@teste.origem`;
  18  |   const senha = `E2e!${randomUUID()}`;
  19  |   const logins: string[] = [];
  20  |   const observarLogin = (req: Request) => {
  21  |     if (
  22  |       new URL(req.url()).pathname === "/api/auth/login" &&
  23  |       req.method() === "POST"
  24  |     )
  25  |       logins.push(req.url());
  26  |   };
  27  |   page.on("request", observarLogin);
  28  |   try {
  29  |     await test.step(`Cadastro inicia sessao de ${papel} sem login separado`, async () => {
  30  |       await page.goto("/cadastro");
  31  |       await page
  32  |         .getByLabel("Nome", { exact: true })
> 33  |         .fill("Pessoa sintética E2E");
      |          ^ Error: locator.fill: Test timeout of 90000ms exceeded.
  34  |       await page.getByLabel("E-mail", { exact: true }).fill(email);
  35  |       await page.getByLabel("Senha", { exact: true }).fill(senha);
  36  |       await page
  37  |         .getByRole("radio", {
  38  |           name: papel === "artesao" ? "Artesão" : "Comprador",
  39  |           exact: true,
  40  |         })
  41  |         .click();
  42  |       const cadastro = page.waitForResponse(
  43  |         (r) =>
  44  |           new URL(r.url()).pathname === "/api/auth/register" &&
  45  |           r.request().method() === "POST",
  46  |       );
  47  |       await page
  48  |         .getByRole("button", { name: "Cadastrar", exact: true })
  49  |         .click();
  50  |       expect((await cadastro).status()).toBe(201);
  51  |       const destino = papel === "artesao" ? "/painel-artesao" : "/";
  52  |       await expect(page).toHaveURL(new RegExp(`${destino}$`));
  53  |       const me = await page.request.get("/api/auth/me");
  54  |       expect(me.status()).toBe(200);
  55  |       expect(await me.json()).toMatchObject({ email, papel });
  56  |       await page.reload();
  57  |       await expect(page).toHaveURL(new RegExp(`${destino}$`));
  58  |       await expect(
  59  |         page.getByRole("button", { name: "Sair", exact: true }).first(),
  60  |       ).toBeVisible();
  61  |       expect(logins).toEqual([]);
  62  |     });
  63  |   } finally {
  64  |     page.off("request", observarLogin);
  65  |   }
  66  | }
  67  | 
  68  | async function comprar(page: Page) {
  69  |   await cadastrar(page, "comprador");
  70  |   await test.step("Busca com filtro e detalhe do produto", async () => {
  71  |     await page
  72  |       .getByRole("searchbox", { name: "Buscar produtos" })
  73  |       .fill("Boneca");
  74  |     await expect(page).toHaveURL(/termo=Boneca/);
  75  |     if ((page.viewportSize()?.width ?? 1280) < 1024)
  76  |       await page.getByRole("button", { name: "Filtros", exact: true }).click();
  77  |     const filtrada = page.waitForResponse((r) => {
  78  |       const url = new URL(r.url());
  79  |       return (
  80  |         url.pathname === "/api/produtos" &&
  81  |         url.searchParams.get("termo") === "Boneca" &&
  82  |         url.searchParams.has("categoriaId")
  83  |       );
  84  |     });
  85  |     await page
  86  |       .getByLabel("Categoria", { exact: true })
  87  |       .selectOption({ label: "Cerâmica e Barro" });
  88  |     const respostaFiltro = await filtrada;
  89  |     expect(respostaFiltro.status()).toBe(200);
  90  |     const categoriaId = await page
  91  |       .getByLabel("Categoria", { exact: true })
  92  |       .inputValue();
  93  |     const lista: { categoriaId: string }[] = await respostaFiltro.json();
  94  |     expect(lista.length).toBeGreaterThan(0);
  95  |     expect(lista.every((item) => item.categoriaId === categoriaId)).toBe(true);
  96  |     await expect(page.getByLabel("Categoria", { exact: true })).not.toHaveValue(
  97  |       "",
  98  |     );
  99  |     if ((page.viewportSize()?.width ?? 1280) < 1024)
  100 |       await page
  101 |         .getByRole("button", { name: "Fechar filtros", exact: true })
  102 |         .click();
  103 |     const resultados = page.getByRole("region", { name: "Resultado da busca" });
  104 |     await resultados.getByRole("link", { name: produto, exact: true }).click();
  105 |     await expect(
  106 |       page.getByRole("heading", { name: produto, exact: true, level: 1 }),
  107 |     ).toBeVisible();
  108 |   });
  109 |   await test.step("Carrinho e checkout pela API real", async () => {
  110 |     const adicionado = page.waitForResponse(
  111 |       (r) =>
  112 |         new URL(r.url()).pathname === "/api/carrinho/itens" &&
  113 |         r.request().method() === "POST",
  114 |     );
  115 |     await page
  116 |       .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
  117 |       .first()
  118 |       .click();
  119 |     expect((await adicionado).ok()).toBe(true);
  120 |     await page
  121 |       .getByRole("link", { name: /^Carrinho/ })
  122 |       .first()
  123 |       .click();
  124 |     await expect(
  125 |       page.getByRole("heading", { name: "Seu carrinho", exact: true }),
  126 |     ).toBeVisible();
  127 |     await expect(page.getByRole("main")).toContainText(produto);
  128 |     await page
  129 |       .getByRole("link", { name: "Finalizar compra", exact: true })
  130 |       .click();
  131 |     await expect(
  132 |       page.getByRole("heading", { name: "Revisar e confirmar pedido" }),
  133 |     ).toBeVisible();
```