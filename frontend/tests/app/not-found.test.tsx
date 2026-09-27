import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";

describe("Pagina 404", () => {
  it("mostra titulo, texto curto e link de volta para a vitrine", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Página não encontrada" })).toBeInTheDocument();
    expect(screen.getByText(/não existe ou foi removida/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar para a vitrine" })).toHaveAttribute("href", "/");
  });
});
