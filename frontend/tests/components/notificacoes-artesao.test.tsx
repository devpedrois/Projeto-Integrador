import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NotificacoesArtesao } from "@/components/painel-artesao/NotificacoesArtesao";
import { HttpNotificacoesService } from "@/services/http/notificacoes.service";

const aviso = {
  id: "683c41de-1fe4-46f3-b279-e3a43f0a1e66",
  pedidoId: "930bf1d0-58cd-40f8-9463-703c63a39f78",
  tipo: "novo_pedido",
  lida: false,
  criadoEm: "2026-10-14T12:00:00.000Z",
};
let dados: (typeof aviso)[];
let falha: boolean;
let leituras: number;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  dados = [];
  falha = false;
  leituras = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit) => {
      if (options.method === "PATCH") {
        expect(url).toBe(`/api/artesao/notificacoes/${aviso.id}/lida`);
        dados = dados.map((n) => ({ ...n, lida: true }));
        return new Response(null, { status: 204 });
      }
      expect(url).toBe("/api/artesao/notificacoes");
      expect(options.credentials).toBe("include");
      leituras++;
      return falha ? Response.json({}, { status: 503 }) : Response.json(dados);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function montar() {
  const tela = render(
    <NotificacoesArtesao service={new HttpNotificacoesService()} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
  await act(async () => {});
  return tela;
}
it("mostra novo pedido no polling de 15s e permite leitura", async () => {
  await montar();
  expect(screen.getByText(/nenhum novo pedido/i)).toBeInTheDocument();
  dados = [
    aviso,
    { ...aviso, id: "3909a36a-1c15-4024-b6d1-3c352fc2bfbe", lida: true },
  ];
  await act(async () => {
    await vi.advanceTimersByTimeAsync(14_999);
  });
  expect(screen.getByText(/nenhum novo pedido/i)).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByRole("status")).toHaveTextContent("1 novos pedidos");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /marcar como lida/i }));
  });
  expect(screen.getByRole("status")).toHaveTextContent("0 novos pedidos");
});
it("para na aba oculta, retoma imediatamente e limpa desmontagem", async () => {
  const tela = await montar();
  expect(leituras).toBe(1);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(45_000);
  });
  expect(leituras).toBe(1);
  dados = [aviso];
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(screen.getByRole("status")).toHaveTextContent("1 novos pedidos");
  const antes = leituras;
  tela.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(leituras).toBe(antes);
});
it("aba inicialmente oculta espera visibilidade", async () => {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await montar();
  expect(leituras).toBe(0);
});
it("erro recuperavel permite tentar novamente", async () => {
  falha = true;
  await montar();
  expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível/i);
  falha = false;
  dados = [aviso];
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
  });
  expect(screen.getByRole("status")).toHaveTextContent("1 novos pedidos");
});
it("adapter rejeita resposta invalida e identificador invalido", async () => {
  dados = [{ ...aviso, lida: "nao" } as unknown as typeof aviso];
  const service = new HttpNotificacoesService();
  await expect(service.listar()).rejects.toMatchObject({
    code: "RESPOSTA_INVALIDA",
  });
  await expect(service.marcarComoLida("../externo")).rejects.toMatchObject({
    code: "ENTRADA_INVALIDA",
  });
});
