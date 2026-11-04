# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: fluxos.spec.ts >> (a) cadastro autenticado ate Meus pedidos sem login separado
- Location: e2e\fluxos.spec.ts:151:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/$/
Received string:  "http://127.0.0.1:3113/login?cadastro=sucesso"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    5 × locator resolved to <html lang="pt-BR" class="__variable_a7b3bd __variable_e59a90">…</html>
      - unexpected value "http://127.0.0.1:3113/cadastro"
    28 × locator resolved to <html lang="pt-BR" class="__variable_a7b3bd __variable_e59a90">…</html>
       - unexpected value "http://127.0.0.1:3113/login?cadastro=sucesso"

```

```yaml
- alert
- banner:
  - link "Origem":
    - /url: /
- main:
  - img "Mãos modelando barro no torno"
  - heading "Entrar" [level=1]
  - text: E-mail
  - textbox "E-mail":
    - /placeholder: nome@email.com
  - text: Senha
  - textbox "Senha"
  - button "Mostrar senha"
  - button "Entrar"
  - paragraph:
    - text: Ainda não tem conta?
    - link "Criar cadastro":
      - /url: /cadastro
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
  21  |     if (new URL(req.url()).pathname === "/api/auth/login" && req.method() === "POST")
  22  |       logins.push(req.url());
  23  |   };
  24  |   page.on("request", observarLogin);
  25  |   try {
  26  |     await test.step(`Cadastro inicia sessao de ${papel} sem login separado`, async () => {
  27  |       await page.goto("/cadastro");
  28  |       await page.getByLabel("Nome", { exact: true }).fill("Pessoa sintética E2E");
  29  |       await page.getByLabel("E-mail", { exact: true }).fill(email);
  30  |       await page.getByLabel("Senha", { exact: true }).fill(senha);
  31  |       await page.getByRole("radio", { name: papel === "artesao" ? "Artesão" : "Comprador", exact: true }).click();
  32  |       const cadastro = page.waitForResponse(
  33  |         (r) => new URL(r.url()).pathname === "/api/auth/register" && r.request().method() === "POST",
  34  |       );
  35  |       await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  36  |       expect((await cadastro).status()).toBe(201);
  37  |       const destino = papel === "artesao" ? "/painel-artesao" : "/";
> 38  |       await expect(page).toHaveURL(new RegExp(`${destino}$`));
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  39  |       const me = await page.request.get("/api/auth/me");
  40  |       expect(me.status()).toBe(200);
  41  |       expect(await me.json()).toMatchObject({ email, papel });
  42  |       await page.reload();
  43  |       await expect(page).toHaveURL(new RegExp(`${destino}$`));
  44  |       await expect(page.getByRole("button", { name: "Sair", exact: true }).first()).toBeVisible();
  45  |       expect(logins).toEqual([]);
  46  |     });
  47  |   } finally {
  48  |     page.off("request", observarLogin);
  49  |   }
  50  | }
  51  | 
  52  | async function comprar(page: Page) {
  53  |   await cadastrar(page, "comprador");
  54  |   await test.step("Busca com filtro e detalhe do produto", async () => {
  55  |     await page
  56  |       .getByRole("searchbox", { name: "Buscar produtos" })
  57  |       .fill("Boneca");
  58  |     await expect(page).toHaveURL(/termo=Boneca/);
  59  |     if ((page.viewportSize()?.width ?? 1280) < 1024)
  60  |       await page.getByRole("button", { name: "Filtros", exact: true }).click();
  61  |     const filtrada = page.waitForResponse((r) => {
  62  |       const url = new URL(r.url());
  63  |       return (
  64  |         url.pathname === "/api/produtos" &&
  65  |         url.searchParams.get("termo") === "Boneca" &&
  66  |         url.searchParams.has("categoriaId")
  67  |       );
  68  |     });
  69  |     await page
  70  |       .getByLabel("Categoria", { exact: true })
  71  |       .selectOption({ label: "Cerâmica e Barro" });
  72  |     const respostaFiltro = await filtrada;
  73  |     expect(respostaFiltro.status()).toBe(200);
  74  |     const categoriaId = await page
  75  |       .getByLabel("Categoria", { exact: true })
  76  |       .inputValue();
  77  |     const lista: { categoriaId: string }[] = await respostaFiltro.json();
  78  |     expect(lista.length).toBeGreaterThan(0);
  79  |     expect(lista.every((item) => item.categoriaId === categoriaId)).toBe(true);
  80  |     await expect(page.getByLabel("Categoria", { exact: true })).not.toHaveValue(
  81  |       "",
  82  |     );
  83  |     if ((page.viewportSize()?.width ?? 1280) < 1024)
  84  |       await page
  85  |         .getByRole("button", { name: "Fechar filtros", exact: true })
  86  |         .click();
  87  |     const resultados = page.getByRole("region", { name: "Resultado da busca" });
  88  |     await resultados.getByRole("link", { name: produto, exact: true }).click();
  89  |     await expect(
  90  |       page.getByRole("heading", { name: produto, exact: true, level: 1 }),
  91  |     ).toBeVisible();
  92  |   });
  93  |   await test.step("Carrinho e checkout pela API real", async () => {
  94  |     const adicionado = page.waitForResponse(
  95  |       (r) =>
  96  |         new URL(r.url()).pathname === "/api/carrinho/itens" &&
  97  |         r.request().method() === "POST",
  98  |     );
  99  |     await page
  100 |       .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
  101 |       .first()
  102 |       .click();
  103 |     expect((await adicionado).ok()).toBe(true);
  104 |     await page
  105 |       .getByRole("link", { name: /^Carrinho/ })
  106 |       .first()
  107 |       .click();
  108 |     await expect(
  109 |       page.getByRole("heading", { name: "Seu carrinho", exact: true }),
  110 |     ).toBeVisible();
  111 |     await expect(page.getByRole("main")).toContainText(produto);
  112 |     await page
  113 |       .getByRole("link", { name: "Finalizar compra", exact: true })
  114 |       .click();
  115 |     await expect(
  116 |       page.getByRole("heading", { name: "Revisar e confirmar pedido" }),
  117 |     ).toBeVisible();
  118 |   });
  119 |   const criado = page.waitForResponse(
  120 |     (r) =>
  121 |       new URL(r.url()).pathname === "/api/pedidos" &&
  122 |       r.request().method() === "POST",
  123 |   );
  124 |   await page
  125 |     .getByRole("button", { name: "Confirmar pedido", exact: true })
  126 |     .click();
  127 |   const resposta = await criado;
  128 |   expect(resposta.status()).toBe(201);
  129 |   const body: { pedido: { numero: string } } = await resposta.json();
  130 |   const numero = body.pedido.numero;
  131 |   expect(numero).toMatch(/^ORG-\d{4}-\d+$/);
  132 |   await expect(
  133 |     page.getByRole("heading", { name: "Pedido confirmado", exact: true }),
  134 |   ).toBeVisible();
  135 |   await expect(page.getByRole("main")).toContainText(numero);
  136 |   await page.getByRole("link", { name: "Minha conta", exact: true }).click();
  137 |   await expect(
  138 |     page.getByRole("heading", { name: "Meus pedidos", exact: true }),
```