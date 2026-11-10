# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: filtros-rapidos.spec.ts >> preserva filtros rapidos, recarga e navegacao no historico
- Location: e2e\filtros-rapidos.spec.ts:3:1

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Filtros', exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - button "Open Next.js Dev Tools" [ref=f1e7] [cursor=pointer]
  - alert [ref=f1e11]
  - banner [ref=f1e12]:
    - generic [ref=f1e13]:
      - link "Origem" [ref=f1e14] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e15]:
        - link "Carrinho 0" [ref=f1e16] [cursor=pointer]:
          - /url: /carrinho
          - text: Carrinho
          - generic [ref=f1e20]: "0"
        - button "Entrar" [ref=f1e21]
  - main [ref=f1e22]:
    - region [ref=f1e23]:
      - generic [ref=f1e24]:
        - generic [ref=f1e25]:
          - heading "Da terra, nasce a forma." [level=1] [ref=f1e26]
          - paragraph [ref=f1e27]: Cada curva guarda um gesto. Cada peça, uma história.
          - generic [ref=f1e28]:
            - generic [ref=f1e29]: Passe o cursor e descubra os detalhes.
            - button "Ver peça completa" [ref=f1e32]
        - img "Vaso de argila modelado à mão, desenhado a grafite sobre papel. Ao passar o cursor, aparece a versão em cerâmica terracota." [ref=f1e37]
    - generic [ref=f1e40]:
      - generic [ref=f1e41]:
        - generic [ref=f1e43]:
          - generic [ref=f1e44]:
            - generic [ref=f1e45]: Buscar produtos
            - searchbox "Buscar produtos" [ref=f1e47]
          - button "Filtros 2" [ref=f1e48]:
            - text: Filtros
            - generic [ref=f1e52]: "2"
        - region "Resultado da busca" [ref=f1e54]:
          - list [ref=f1e55]:
            - listitem [ref=f1e56]:
              - link [aria-hidden] [ref=f1e57] [cursor=pointer]:
                - /url: /produto/d0b27522-de25-5454-bf78-68f5beaa88c2
              - generic [ref=f1e58]:
                - link "Conjunto de Xícaras de Barro" [ref=f1e59] [cursor=pointer]:
                  - /url: /produto/d0b27522-de25-5454-bf78-68f5beaa88c2
                - generic [ref=f1e60]:
                  - text: por
                  - link "Maria Artesã" [ref=f1e61] [cursor=pointer]:
                    - /url: /artesao/9b45586e-ccae-57dc-af34-b7b9d197a8e2
                - generic [ref=f1e62]: R$ 123,90
              - button "Adicionar ao carrinho" [ref=f1e63]
            - listitem [ref=f1e67]:
              - link [aria-hidden] [ref=f1e68] [cursor=pointer]:
                - /url: /produto/8c92b8ec-1ecf-5965-b13f-920d45c803b8
              - generic [ref=f1e69]:
                - link "Jarra Cerâmica Esculpida" [ref=f1e70] [cursor=pointer]:
                  - /url: /produto/8c92b8ec-1ecf-5965-b13f-920d45c803b8
                - generic [ref=f1e71]:
                  - text: por
                  - link "Maria Artesã" [ref=f1e72] [cursor=pointer]:
                    - /url: /artesao/9b45586e-ccae-57dc-af34-b7b9d197a8e2
                - generic [ref=f1e73]: R$ 84,90
              - button "Adicionar ao carrinho" [ref=f1e74]
            - listitem [ref=f1e78]:
              - link [aria-hidden] [ref=f1e79] [cursor=pointer]:
                - /url: /produto/bea28e1c-8186-5541-a254-16c3fdc795fc
              - generic [ref=f1e80]:
                - link "Panela de Barro Vidrada" [ref=f1e81] [cursor=pointer]:
                  - /url: /produto/bea28e1c-8186-5541-a254-16c3fdc795fc
                - generic [ref=f1e82]:
                  - text: por
                  - link "Maria Artesã" [ref=f1e83] [cursor=pointer]:
                    - /url: /artesao/9b45586e-ccae-57dc-af34-b7b9d197a8e2
                - generic [ref=f1e84]: R$ 59,40
              - button "Adicionar ao carrinho" [ref=f1e85]
      - region "Recomendacoes de produtos" [ref=f1e89]:
        - heading "Recomendado para você" [level=2] [ref=f1e90]
        - list [ref=f1e91]:
          - listitem [ref=f1e92]:
            - generic [ref=f1e94]:
              - link "Boneca de Barro Pintada" [ref=f1e95] [cursor=pointer]:
                - /url: /produto/7bcae074-7451-5794-8ae2-d01bc4a7922d
              - generic [ref=f1e96]: R$ 78,90
          - listitem [ref=f1e97]:
            - generic [ref=f1e99]:
              - link "Vaso de Barro Trançado" [ref=f1e100] [cursor=pointer]:
                - /url: /produto/92c0add2-a938-586c-8a8c-542b22cffb50
              - generic [ref=f1e101]: R$ 39,90
          - listitem [ref=f1e102]:
            - generic [ref=f1e104]:
              - link "Panela de Barro Vidrada" [ref=f1e105] [cursor=pointer]:
                - /url: /produto/bea28e1c-8186-5541-a254-16c3fdc795fc
              - generic [ref=f1e106]: R$ 59,40
          - listitem [ref=f1e107]:
            - generic [ref=f1e109]:
              - link "Toalha de Renda Irlandesa" [ref=f1e110] [cursor=pointer]:
                - /url: /produto/a30d8332-3396-5b8e-839e-7892752eb1ec
              - generic [ref=f1e111]: R$ 39,90
          - listitem [ref=f1e112]:
            - generic [ref=f1e114]:
              - link "Brinco Trançado em Fibra" [ref=f1e115] [cursor=pointer]:
                - /url: /produto/75f3bf4e-8094-554d-8344-f4ce611e9a3c
              - generic [ref=f1e116]: R$ 59,40
          - listitem [ref=f1e117]:
            - generic [ref=f1e119]:
              - link "Colher de Pau Esculpida" [ref=f1e120] [cursor=pointer]:
                - /url: /produto/1dfc1125-fdc5-59ea-8475-e6d80428cbf6
              - generic [ref=f1e121]: R$ 59,40
          - listitem [ref=f1e122]:
            - generic [ref=f1e124]:
              - link "Manta em Tear Manual" [ref=f1e125] [cursor=pointer]:
                - /url: /produto/9e9d4981-9ddd-5d72-b957-d33b520aed65
              - generic [ref=f1e126]: R$ 59,40
          - listitem [ref=f1e127]:
            - generic [ref=f1e129]:
              - link "Tapete Tecido à Mão" [ref=f1e130] [cursor=pointer]:
                - /url: /produto/03610ae2-3a84-5fd5-af17-1d078bb7e623
              - generic [ref=f1e131]: R$ 104,40
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("preserva filtros rapidos, recarga e navegacao no historico", async ({
  4  |   page,
  5  | }) => {
  6  |   await page.goto("/");
  7  |   await page
  8  |     .getByRole("button", { name: "Continuar como visitante", exact: true })
  9  |     .click();
  10 |   const mobile = (page.viewportSize()?.width ?? 1280) < 1024;
  11 |   if (mobile)
  12 |     await page.getByRole("button", { name: "Filtros", exact: true }).click();
  13 |   const categoria = page.getByRole("combobox", {
  14 |     name: "Categoria",
  15 |     exact: true,
  16 |   });
  17 |   const tecnica = page.getByRole("combobox", { name: "Técnica", exact: true });
  18 |   await expect(categoria).toBeEnabled();
  19 |   await categoria.selectOption({ label: "Cerâmica e Barro" });
  20 |   const categoriaId = await categoria.inputValue();
  21 |   await tecnica.selectOption({ label: "Torno Cerâmico" });
  22 |   const tecnicaId = await tecnica.inputValue();
  23 | 
  24 |   await expect
  25 |     .poll(() => {
  26 |       const params = new URL(page.url()).searchParams;
  27 |       return [params.get("categoria"), params.get("tecnica")];
  28 |     })
  29 |     .toEqual([categoriaId, tecnicaId]);
  30 |   const filtrada = page.url();
  31 |   await page.reload();
  32 |   if (mobile)
> 33 |     await page.getByRole("button", { name: "Filtros", exact: true }).click();
     |                                                                      ^ Error: locator.click: Test timeout of 90000ms exceeded.
  34 |   await expect(categoria).toHaveValue(categoriaId);
  35 |   await expect(tecnica).toHaveValue(tecnicaId);
  36 |   await page
  37 |     .getByRole(mobile ? "dialog" : "complementary", {
  38 |       name: "Filtros",
  39 |       exact: true,
  40 |     })
  41 |     .getByRole("button", { name: "Limpar filtros", exact: true })
  42 |     .click();
  43 |   await expect.poll(() => new URL(page.url()).search).toBe("");
  44 |   await page.goBack();
  45 |   await expect(page).toHaveURL(filtrada);
  46 |   await expect(categoria).toHaveValue(categoriaId);
  47 |   await expect(tecnica).toHaveValue(tecnicaId);
  48 | });
  49 | 
```