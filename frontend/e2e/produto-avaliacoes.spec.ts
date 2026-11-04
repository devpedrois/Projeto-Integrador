import { test, expect } from "@playwright/test";

test("32.2 produto demo mostra quatro paginas de avaliacoes reais", async ({
  page,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continuar como visitante", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Buscar produtos" }),
  ).toBeVisible();
  const catalogo = await page.request.get(
    "/api/produtos?termo=Boneca%20de%20Barro%20Pintada",
  );
  expect(catalogo.status()).toBe(200);
  const produtos = (await catalogo.json()) as { id: string; nome: string }[];
  const produto = produtos.find(
    (item) => item.nome === "Boneca de Barro Pintada",
  );
  expect(produto).toBeDefined();
  if (!produto) throw new Error("Produto demo ausente");
  await page.goto(`/produto/${produto.id}`);
  const comentarios = page.getByRole("region", {
    name: "Avaliações do produto",
  });
  for (let pagina = 1; pagina <= 4; pagina += 1) {
    await expect(comentarios.getByText(`Página ${pagina} de 4`)).toBeVisible();
    await expect(comentarios.getByRole("listitem")).toHaveCount(
      pagina === 4 ? 5 : 10,
    );
    await expect(
      page.getByText("Nota 3,0 de 5 (35 avaliações)", { exact: true }),
    ).toBeVisible();
    if (pagina === 1 || pagina === 4) {
      await comentarios.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(
          `produto-pagina-${pagina}-${info.project.name}.png`,
        ),
        fullPage: true,
      });
    }
    if (pagina < 4) {
      const resposta = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/avaliacoes" &&
          url.searchParams.get("offset") === String(pagina * 10)
        );
      });
      await comentarios.getByRole("button", { name: "Próxima" }).click();
      const response = await resposta;
      expect(response.status()).toBe(200);
      const dados = await response.json();
      expect(dados.resumo).toEqual({ media: 3, total: 35 });
      expect(JSON.stringify(dados)).not.toContain("compradorId");
    }
  }
  await expect(
    comentarios.getByRole("button", { name: "Próxima" }),
  ).toBeDisabled();
  await comentarios.getByRole("button", { name: "Anterior" }).click();
  await expect(comentarios.getByText("Página 3 de 4")).toBeVisible();
  const largura = await page.evaluate(() => ({
    viewport: innerWidth,
    documento: document.documentElement.scrollWidth,
  }));
  expect(largura.documento).toBeLessThanOrEqual(largura.viewport);
});
