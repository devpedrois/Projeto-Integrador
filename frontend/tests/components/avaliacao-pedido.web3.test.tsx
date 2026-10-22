import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MeusPedidos } from "@/components/minha-conta/MeusPedidos";
import { HttpPedidosService } from "@/services/http/pedidos.service";
import { HttpAvaliacoesService } from "@/services/http/avaliacoes.service";

const produtoId = "11111111-1111-4111-8111-111111111111";
const outroProdutoId = "22222222-2222-4222-8222-222222222222";
const compradorId = "33333333-3333-4333-8333-333333333333";
const pedido = {
  id: "44444444-4444-4444-8444-444444444444",
  compradorId,
  numero: "ORG-2026-000003",
  status: "confirmado",
  total: 20,
  criadoEm: "2026-10-22T12:00:00.000Z",
};
const avaliacao = {
  id: "55555555-5555-4555-8555-555555555555",
  produtoId,
  compradorId,
  nota: 5,
  criadoEm: pedido.criadoEm,
};
let statusPedido = "confirmado";
let existente = false;
let naoComprou = false;
let falhaLeitura = false;
let postar: () => Promise<Response>;

async function abrir() {
  const resultado = render(
    <MeusPedidos
      service={new HttpPedidosService()}
      avaliacoesService={new HttpAvaliacoesService()}
      compradorId={compradorId}
    />,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Ver pedido ORG-2026-000003" }),
  );
  await screen.findByRole("region", { name: "Detalhe do pedido" });
  return resultado;
}
function envios() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, options]) => options?.method === "POST");
}
beforeEach(() => {
  statusPedido = "confirmado";
  existente = false;
  naoComprou = false;
  falhaLeitura = false;
  postar = async () => Response.json(avaliacao, { status: 201 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") return postar();
      if (url.startsWith("/api/avaliacoes/elegibilidade?")) {
        if (falhaLeitura) return Response.json({}, { status: 503 });
        const jaAvaliou = existente && url.includes(produtoId);
        return Response.json(
          naoComprou
            ? { podeAvaliar: false, motivo: "nao_comprou" }
            : jaAvaliou
              ? { podeAvaliar: false, motivo: "ja_avaliou" }
              : { podeAvaliar: true, motivo: null },
        );
      }
      if (url.startsWith("/api/pedidos?"))
        return Response.json({
          itens: [{ ...pedido, status: statusPedido, pagamento: null }],
          pagina: 1,
          limite: 10,
          total: 1,
        });
      if (url.startsWith("/api/pedidos/"))
        return Response.json({
          pedido: { ...pedido, status: statusPedido },
          pagamento: null,
          itens: [
            {
              produtoId,
              nome: "Vaso artesanal",
              quantidade: 1,
              precoUnitario: 10,
              subtotal: 10,
            },
            {
              produtoId: outroProdutoId,
              nome: "Peca de barro",
              quantidade: 1,
              precoUnitario: 10,
              subtotal: 10,
            },
          ],
        });
      if (falhaLeitura) return Response.json({}, { status: 503 });
      const itens = existente && url.includes(produtoId) ? [avaliacao] : [];
      return Response.json({
        itens,
        resumo: { media: itens.length ? 5 : 0, total: itens.length },
      });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Web.3 avaliacao no detalhe do pedido", () => {
  it("Web.4 nao mostra botao nem formulario quando a API informa que nao comprou", async () => {
    naoComprou = true;
    await abrir();
    expect(
      await screen.findAllByText(
        "Avaliação disponível somente após compra confirmada.",
      ),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Enviar avaliação" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(envios()).toHaveLength(0);
  });

  it("Web.4 remove o formulario se a compra deixar de ser valida antes do envio", async () => {
    postar = async () =>
      Response.json(
        { error: { code: "COMPRA_NAO_VERIFICADA" } },
        { status: 403 },
      );
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    await userEvent.click(within(form).getByLabelText("5 estrelas"));
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(
      await screen.findByText(
        "Avaliação disponível somente após compra confirmada.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Avaliar Vaso artesanal" }),
    ).not.toBeInTheDocument();
  });

  it("mostra um formulario por item e impede envio sem nota", async () => {
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    expect(
      await screen.findByRole("form", { name: "Avaliar Peca de barro" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(within(form).getByRole("alert")).toHaveTextContent(
      /inteiro de 1 a 5/,
    );
    expect(envios()).toHaveLength(0);
  });

  it("valida 501 caracteres sem chamar o servidor", async () => {
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    await userEvent.click(within(form).getByLabelText("5 estrelas"));
    fireEvent.change(within(form).getByLabelText("Comentário opcional"), {
      target: { value: "a".repeat(501) },
    });
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(within(form).getByRole("alert")).toHaveTextContent(/500/);
    expect(envios()).toHaveLength(0);
  });

  it("mostra envio e sucesso, bloqueando tentativas simultaneas", async () => {
    let resolver!: (response: Response) => void;
    postar = () =>
      new Promise((resolve) => {
        resolver = resolve;
      });
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    await userEvent.click(within(form).getByLabelText("5 estrelas"));
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(
      within(form).getByRole("button", { name: /Enviando/ }),
    ).toBeDisabled();
    fireEvent.submit(form);
    expect(envios()).toHaveLength(1);
    await act(async () => resolver(Response.json(avaliacao, { status: 201 })));
    expect(
      await screen.findByText("Avaliação enviada com sucesso."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Avaliar Vaso artesanal" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Avaliar Peca de barro" }),
    ).toBeInTheDocument();
  });

  it("409 mostra ja avaliado, sem permitir novo envio", async () => {
    postar = async () =>
      Response.json(
        { error: { code: "AVALIACAO_DUPLICADA" } },
        { status: 409 },
      );
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    await userEvent.click(within(form).getByLabelText("5 estrelas"));
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(
      await screen.findByText("Você já avaliou este produto."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Avaliar Vaso artesanal" }),
    ).not.toBeInTheDocument();
  });

  it("identifica avaliacao anterior apos reabrir o pedido", async () => {
    existente = true;
    await abrir();
    expect(
      await screen.findByText("Você já avaliou este produto."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Avaliar Vaso artesanal" }),
    ).not.toBeInTheDocument();
    expect(envios()).toHaveLength(0);
  });

  it("erro de envio preserva campos e permite tentar novamente", async () => {
    postar = async () => Response.json({}, { status: 503 });
    await abrir();
    const form = await screen.findByRole("form", {
      name: "Avaliar Vaso artesanal",
    });
    await userEvent.click(within(form).getByLabelText("5 estrelas"));
    await userEvent.type(
      within(form).getByLabelText("Comentário opcional"),
      "Gostei da peca",
    );
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(await within(form).findByRole("alert")).toHaveTextContent(
      "Não foi possível enviar sua avaliação.",
    );
    expect(within(form).getByLabelText("Comentário opcional")).toHaveValue(
      "Gostei da peca",
    );
    postar = async () =>
      Response.json(
        { ...avaliacao, comentario: "Gostei da peca" },
        { status: 201 },
      );
    await userEvent.click(
      within(form).getByRole("button", { name: "Enviar avaliação" }),
    );
    expect(
      await screen.findByText("Avaliação enviada com sucesso."),
    ).toBeInTheDocument();
  });

  it("falha ao consultar ja avaliado permite recuperar a leitura", async () => {
    falhaLeitura = true;
    await abrir();
    const controles = await screen.findAllByRole("button", {
      name: "Tentar novamente",
    });
    falhaLeitura = false;
    await userEvent.click(controles[0]!);
    expect(
      await screen.findByRole("form", { name: "Avaliar Vaso artesanal" }),
    ).toBeInTheDocument();
  });

  it.each(["pendente", "cancelado"])(
    "nao oferece formulario no pedido %s",
    async (status) => {
      statusPedido = status;
      await abrir();
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([url]) => String(url).includes("/avaliacoes")),
      ).toBe(false);
    },
  );
});
