import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

test("32.1 indicadores reais: dez recargas e tres larguras", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "1280px",
    "Mede dez recargas no mesmo viewport.",
  );
  const login = await page.request.post("/api/auth/login", {
    data: { email: "admin@origem.test", senha: "senha-sintetica-admin" },
  });
  expect(login.status()).toBe(200);
  await page.goto("/admin");
  const card = page.getByRole("region", { name: "Indicadores da plataforma" });
  await expect(card.locator("time")).toBeVisible();
  await page.waitForLoadState("networkidle");
  const medicoes: {
    recarga: number;
    tempoMs: number;
    apiMs: number;
    status: number;
  }[] = [];
  for (let recarga = 1; recarga <= 10; recarga += 1) {
    const resposta = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/admin/indicadores",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    const response = await resposta;
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    await expect(card.locator("time")).toBeVisible();
    await expect(card.locator("dd")).toHaveCount(4);
    const tempos = await card.evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (
        !element.querySelector("time") ||
        element.getBoundingClientRect().height === 0
      )
        throw new Error("Card nao renderizado");
      const api = performance
        .getEntriesByType("resource")
        .find(
          (entry) => new URL(entry.name).pathname === "/api/admin/indicadores",
        );
      return { tempoMs: performance.now(), apiMs: api?.duration ?? 0 };
    });
    medicoes.push({ recarga, ...tempos, status: response.status() });
    expect(tempos.tempoMs, `Recarga ${recarga} ate card pintado`).toBeLessThan(
      2000,
    );
  }
  const responsividade = [];
  for (const largura of [360, 768, 1280]) {
    await page.setViewportSize({ width: largura, height: 1000 });
    await expect(card.locator("time")).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documento: document.documentElement.scrollWidth,
      corpo: document.body.scrollWidth,
    }));
    responsividade.push({ largura, ...layout });
    expect(layout.documento).toBeLessThanOrEqual(largura);
    expect(layout.corpo).toBeLessThanOrEqual(largura);
    await page.screenshot({
      path: info.outputPath(`admin-${largura}px.png`),
      fullPage: true,
    });
  }
  const indicadores = await page.request.get("/api/admin/indicadores");
  expect(indicadores.status()).toBe(200);
  const evidence = {
    metodologia:
      "Next dev e API local, PostgreSQL real em schema E2E isolado. Uma navegacao inicial de aquecimento; dez recargas completas autenticadas em 1280px. performance.now desde navigationStart ate quatro valores e time visiveis, mais dois requestAnimationFrame. Sem interceptar respostas ou simular rede. Cache-Control no-store.",
    medicoes,
    responsividade,
    network: {
      method: "GET",
      path: "/api/admin/indicadores",
      status: indicadores.status(),
      cacheControl: indicadores.headers()["cache-control"],
      body: await indicadores.json(),
    },
  };
  const file = info.outputPath("indicadores-admin.json");
  await writeFile(file, JSON.stringify(evidence, null, 2) + "\n", {
    flag: "wx",
  });
  await info.attach("Indicadores reais e tempos", {
    path: file,
    contentType: "application/json",
  });
  const tabela = [
    "| Recarga | Card renderizado | API |",
    "|---|---:|---:|",
    ...medicoes.map(
      (m) =>
        `| ${m.recarga} | ${m.tempoMs.toFixed(1)} ms | ${m.apiMs.toFixed(1)} ms |`,
    ),
  ].join("\n");
  await writeFile(join(info.outputDir, "medicoes.md"), tabela + "\n", {
    flag: "wx",
  });
});
