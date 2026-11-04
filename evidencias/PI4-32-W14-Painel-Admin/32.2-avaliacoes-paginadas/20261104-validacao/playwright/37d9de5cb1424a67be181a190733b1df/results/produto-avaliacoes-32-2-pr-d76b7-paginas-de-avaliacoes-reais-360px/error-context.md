# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: produto-avaliacoes.spec.ts >> 32.2 produto demo mostra quatro paginas de avaliacoes reais
- Location: e2e\produto-avaliacoes.spec.ts:3:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('region', { name: 'Avaliações do produto' }).getByText('Página 1 de 4')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('region', { name: 'Avaliações do produto' }).getByText('Página 1 de 4') with timeout 15000ms
  - waiting for getByRole('region', { name: 'Avaliações do produto' }).getByText('Página 1 de 4')

```

```yaml
- alert
- banner:
  - link "Origem":
    - /url: /
- main:
  - img "Mãos modelando barro no torno"
  - text: Boas-vindas ao Origem
  - heading "Peças feitas à mão, direto de quem faz." [level=1]
  - paragraph: O Origem conecta artesãos da Comunidade do Pilar, do Alto do Moura e de Tracunhaém a compradores de todo o Brasil.
  - button "Continuar como visitante"
  - link "Entrar como comprador":
    - /url: /login
  - link "Entrar como artesão":
    - /url: /login
  - link "Entrar como administrador":
    - /url: /login
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("32.2 produto demo mostra quatro paginas de avaliacoes reais", async ({
  4  |   page,
  5  | }, info) => {
  6  |   const catalogo = await page.request.get(
  7  |     "/api/produtos?termo=Boneca%20de%20Barro%20Pintada",
  8  |   );
  9  |   expect(catalogo.status()).toBe(200);
  10 |   const produtos = (await catalogo.json()) as { id: string; nome: string }[];
  11 |   const produto = produtos.find(
  12 |     (item) => item.nome === "Boneca de Barro Pintada",
  13 |   );
  14 |   expect(produto).toBeDefined();
  15 |   if (!produto) throw new Error("Produto demo ausente");
  16 |   await page.goto(`/produto/${produto.id}`);
  17 |   const comentarios = page.getByRole("region", {
  18 |     name: "Avaliações do produto",
  19 |   });
  20 |   for (let pagina = 1; pagina <= 4; pagina += 1) {
> 21 |     await expect(comentarios.getByText(`Página ${pagina} de 4`)).toBeVisible();
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  22 |     await expect(comentarios.getByRole("listitem")).toHaveCount(
  23 |       pagina === 4 ? 5 : 10,
  24 |     );
  25 |     await expect(
  26 |       page.getByText("Nota 3,0 de 5 (35 avaliações)", { exact: true }),
  27 |     ).toBeVisible();
  28 |     if (pagina === 1 || pagina === 4) {
  29 |       await comentarios.scrollIntoViewIfNeeded();
  30 |       await page.screenshot({
  31 |         path: info.outputPath(
  32 |           `produto-pagina-${pagina}-${info.project.name}.png`,
  33 |         ),
  34 |         fullPage: true,
  35 |       });
  36 |     }
  37 |     if (pagina < 4) {
  38 |       const resposta = page.waitForResponse((response) => {
  39 |         const url = new URL(response.url());
  40 |         return (
  41 |           url.pathname === "/api/avaliacoes" &&
  42 |           url.searchParams.get("offset") === String(pagina * 10)
  43 |         );
  44 |       });
  45 |       await comentarios.getByRole("button", { name: "Próxima" }).click();
  46 |       const response = await resposta;
  47 |       expect(response.status()).toBe(200);
  48 |       const dados = await response.json();
  49 |       expect(dados.resumo).toEqual({ media: 3, total: 35 });
  50 |       expect(JSON.stringify(dados)).not.toContain("compradorId");
  51 |     }
  52 |   }
  53 |   await expect(
  54 |     comentarios.getByRole("button", { name: "Próxima" }),
  55 |   ).toBeDisabled();
  56 |   await comentarios.getByRole("button", { name: "Anterior" }).click();
  57 |   await expect(comentarios.getByText("Página 3 de 4")).toBeVisible();
  58 |   const largura = await page.evaluate(() => ({
  59 |     viewport: innerWidth,
  60 |     documento: document.documentElement.scrollWidth,
  61 |   }));
  62 |   expect(largura.documento).toBeLessThanOrEqual(largura.viewport);
  63 | });
  64 | 
```