import { describe, expect, it } from "vitest";
import { validarFotoPerfil } from "@/validators/foto-perfil.validator";

const jpg = new Uint8Array(500 * 1024);
jpg.set([255, 216, 255, 224]);
describe("Web.6 validacao da foto", () => {
  it.each([
    [
      "PDF renomeado",
      new File(["%PDF-1.7"], "foto.jpg", { type: "image/jpeg" }),
    ],
    [
      "PNG 3 MB",
      new File([new Uint8Array(3 * 1024 * 1024)], "foto.png", {
        type: "image/png",
      }),
    ],
    ["GIF", new File(["GIF89a"], "foto.gif", { type: "image/gif" })],
    ["MIME divergente", new File([jpg], "foto.png", { type: "image/png" })],
  ])("rejeita %s", async (_nome, arquivo) => {
    await expect(validarFotoPerfil(arquivo)).rejects.toThrow();
  });
  it("aceita JPG 500 KB", async () => {
    await expect(
      validarFotoPerfil(new File([jpg], "foto.jpg", { type: "image/jpeg" })),
    ).resolves.toBeUndefined();
  });
});
