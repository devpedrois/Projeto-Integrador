import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DetalheProduto } from "@/components/produto/DetalheProduto";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";
import { HttpProdutosService } from "@/services/http/produtos.service";
import { HttpOpcoesFiltroService } from "@/services/http/opcoes-filtro.service";

const produtoId = "11111111-1111-4111-8111-111111111111";
const produto = {
  id: produtoId,
  nome: "Peca sintetica",
  descricao: "Teste de comentarios",
  preco: 10,
  categoriaId: "categoria",
  tecnicaId: "tecnica",
  regiaoId: "regiao",
  artesaoId: "artesao",
  fotos: [],
  quantidadeEstoque: 1,
  quantidadeVendida: 0,
  notaMedia: 4.4,
  ativo: true,
  criadoEm: "2026-10-01T12:00:00.000Z",
};
const notas = Array.from({ length: 35 }, (_, indice) => ({
  id: `avaliacao-${indice + 1}`,
  produtoId,
  nota: 5,
  comentario: `Comentario ${indice + 1}`,
  criadoEm: "2026-10-01T12:00:00.000Z",
}));
let responder: (offset: number) => Promise<Response>;

beforeEach(() => {
  responder = async (offset) =>
    Response.json({
      itens: notas.slice(offset, offset + 10),
      resumo: { media: 4.4, total: 35 },
    });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      const url = new URL(path, "http://localhost");
      if (url.pathname === `/api/produtos/${produtoId}`)
        return Response.json(produto);
      if (url.pathname === "/api/avaliacoes")
        return responder(Number(url.searchParams.get("offset") ?? 0));
      return Response.json([]);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar() {
  return render(
    <DetalheProduto
      produtoId={produtoId}
      produtosService={new HttpProdutosService()}
      avaliacoesService={new HttpAvaliacoesService()}
      opcoesFiltroService={new HttpOpcoesFiltroService()}
      usuariosService={null}
      recomendacoesService={null}
      onAdicionarAoCarrinho={() => {}}
    />,
  );
}
async function comentarios() {
  return screen.findByRole("region", { name: "Avaliações do produto" });
}

it("navega por quatro paginas e volta mantendo media e total", async () => {
  montar();
  const regiao = await comentarios();
  expect(await within(regiao).findByText("Página 1 de 4")).toBeInTheDocument();
  expect(
    within(regiao).getByRole("button", { name: "Anterior" }),
  ).toBeDisabled();
  for (let pagina = 1; pagina <= 4; pagina += 1) {
    expect(within(regiao).getAllByRole("listitem")).toHaveLength(
      pagina === 4 ? 5 : 10,
    );
    expect(
      screen.getByText("Nota 4,4 de 5 (35 avaliações)"),
    ).toBeInTheDocument();
    if (pagina < 4) {
      await userEvent.click(
        within(regiao).getByRole("button", { name: "Próxima" }),
      );
      expect(
        await within(regiao).findByText(`Página ${pagina + 1} de 4`),
      ).toBeInTheDocument();
    }
  }
  expect(
    within(regiao).getByRole("button", { name: "Próxima" }),
  ).toBeDisabled();
  expect(within(regiao).getByText("Comentario 35")).toBeInTheDocument();
  await userEvent.click(
    within(regiao).getByRole("button", { name: "Anterior" }),
  );
  expect(await within(regiao).findByText("Página 3 de 4")).toBeInTheDocument();
  expect(within(regiao).getByText("Comentario 21")).toBeInTheDocument();
});

it("mostra carregando ao trocar pagina e preserva resumo", async () => {
  montar();
  const regiao = await comentarios();
  await within(regiao).findByText("Página 1 de 4");
  let resolver!: (response: Response) => void;
  responder = () =>
    new Promise((resolve) => {
      resolver = resolve;
    });
  await userEvent.click(
    within(regiao).getByRole("button", { name: "Próxima" }),
  );
  expect(within(regiao).getByRole("status")).toHaveTextContent(
    "Carregando avaliações",
  );
  expect(screen.getByText("Nota 4,4 de 5 (35 avaliações)")).toBeInTheDocument();
  await act(async () =>
    resolver(
      Response.json({
        itens: notas.slice(10, 20),
        resumo: { media: 4.4, total: 35 },
      }),
    ),
  );
  expect(await within(regiao).findByText("Página 2 de 4")).toBeInTheDocument();
});

it("recupera falha da segunda pagina com tentar novamente", async () => {
  montar();
  const regiao = await comentarios();
  await within(regiao).findByText("Página 1 de 4");
  responder = async () => Response.json({}, { status: 503 });
  await userEvent.click(
    within(regiao).getByRole("button", { name: "Próxima" }),
  );
  expect(await within(regiao).findByRole("alert")).toBeInTheDocument();
  responder = async (offset) =>
    Response.json({
      itens: notas.slice(offset, offset + 10),
      resumo: { media: 4.4, total: 35 },
    });
  await userEvent.click(
    within(regiao).getByRole("button", { name: "Tentar novamente" }),
  );
  expect(await within(regiao).findByText("Página 2 de 4")).toBeInTheDocument();
});

it("mostra vazio depois de leitura sem avaliacoes", async () => {
  responder = async () =>
    Response.json({ itens: [], resumo: { media: 0, total: 0 } });
  montar();
  const regiao = await comentarios();
  expect(
    await within(regiao).findByText("Nenhuma avaliação registrada ainda."),
  ).toBeInTheDocument();
  expect(
    within(regiao).queryByRole("button", { name: "Próxima" }),
  ).not.toBeInTheDocument();
});
