// @vitest-environment node
import { strToU8, strFromU8, zipSync, unzipSync } from "fflate";
import { expect, it } from "vitest";

it("31.3 remove senhas e cookies sem perder eventos e imagens", async () => {
  const { sanitizeTraceZip } = await import("../../e2e/sanitize-traces.mjs");
  const image = new Uint8Array([255, 0, 128, 1]);
  const input = zipSync({
    "test.trace": strToU8(
      JSON.stringify({
        type: "before",
        params: {
          locator: 'getByLabel("Senha")',
          value: "senha-exclusiva-e2e",
        },
      }) +
        "\n" +
        JSON.stringify({
          type: "log",
          message: 'filled "senha-exclusiva-e2e"',
        }),
    ),
    "1.network": strToU8(
      JSON.stringify({
        request: {
          headers: [{ name: "Cookie", value: "origem_sessao=token-exclusivo" }],
          postData: {
            text: JSON.stringify({
              email: "e2e@teste.origem",
              senha: "senha-exclusiva-e2e",
            }),
          },
        },
        response: {
          headers: [
            { name: "Set-Cookie", value: "origem_sessao=token-exclusivo" },
          ],
        },
        numero: "ORG-2026-001",
      }),
    ),
    "resources/foto.png": image,
    "resources/src@spec.txt": strToU8('login("senha-sintetica-artesao")'),
    "src/spec.ts": strToU8('login("senha-sintetica-artesao")'),
  });
  const output = unzipSync(sanitizeTraceZip(input));
  const events = strFromU8(output["test.trace"]!);
  const network = strFromU8(output["1.network"]!);
  expect(events).not.toContain("senha-exclusiva-e2e");
  expect(network).not.toContain("senha-exclusiva-e2e");
  expect(network).not.toContain("token-exclusivo");
  expect(network).toContain("ORG-2026-001");
  expect(events).toContain('"type":"before"');
  expect(output["resources/foto.png"]).toEqual(image);
  expect(output["resources/src@spec.txt"]).toBeUndefined();
  expect(output["src/spec.ts"]).toBeUndefined();
});
