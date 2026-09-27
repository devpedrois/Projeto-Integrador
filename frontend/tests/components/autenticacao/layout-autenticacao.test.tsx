import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutAutenticacao } from "@/components/autenticacao/LayoutAutenticacao";

describe("LayoutAutenticacao", () => {
  it("exibe a foto de maos modelando barro no painel lateral", () => {
    render(
      <LayoutAutenticacao imagemNoMobile="compacta">
        <p>Formulario</p>
      </LayoutAutenticacao>
    );

    const foto = screen.getByRole("img", { name: "Mãos modelando barro no torno" });
    expect(foto.tagName).toBe("IMG");
    expect(decodeURIComponent(foto.getAttribute("src") ?? "")).toContain(
      "/imagens/maos-barro.webp"
    );
  });
});
