import { expect, test } from "@playwright/test";

test("preserva filtros rapidos, recarga e navegacao no historico", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continuar como visitante", exact: true })
    .click();
  const mobile = (page.viewportSize()?.width ?? 1280) < 1024;
  if (mobile)
    await page.getByRole("button", { name: /^Filtros(?: \d+)?$/ }).click();
  const categoria = page.getByRole("combobox", {
    name: "Categoria",
    exact: true,
  });
  const tecnica = page.getByRole("combobox", { name: "Técnica", exact: true });
  await expect(categoria).toBeEnabled();
  await categoria.selectOption({ label: "Cerâmica e Barro" });
  const categoriaId = await categoria.inputValue();
  await tecnica.selectOption({ label: "Torno Cerâmico" });
  const tecnicaId = await tecnica.inputValue();

  await expect
    .poll(() => {
      const params = new URL(page.url()).searchParams;
      return [params.get("categoria"), params.get("tecnica")];
    })
    .toEqual([categoriaId, tecnicaId]);
  const filtrada = page.url();
  await page.reload();
  if (mobile)
    await page.getByRole("button", { name: /^Filtros(?: \d+)?$/ }).click();
  await expect(categoria).toHaveValue(categoriaId);
  await expect(tecnica).toHaveValue(tecnicaId);
  await page
    .getByRole(mobile ? "dialog" : "complementary", {
      name: "Filtros",
      exact: true,
    })
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).search).toBe("");
  await page.goBack();
  await expect(page).toHaveURL(filtrada);
  await expect(categoria).toHaveValue(categoriaId);
  await expect(tecnica).toHaveValue(tecnicaId);
});
