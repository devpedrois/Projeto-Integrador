import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HttpIndicadoresAdminService } from "@/services/http/indicadores-admin.service";

const dados = {
  artesaosAtivos: 3,
  produtosAtivos: 3,
  pedidosConfirmados: 4,
  receitaTotal: "100000000.29",
  atualizadoEm: "2026-11-04T12:00:00.000Z",
};
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

it("consulta indicadores administrativos com cookie e sem cache", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ ...dados, privado: "descartar" }),
  );
  expect(await new HttpIndicadoresAdminService().obter()).toEqual(dados);
  expect(fetch).toHaveBeenCalledWith(
    "/api/admin/indicadores",
    expect.objectContaining({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }),
  );
});

it.each([
  null,
  [],
  {},
  { ...dados, artesaosAtivos: -1 },
  { ...dados, produtosAtivos: 1.5 },
  { ...dados, pedidosConfirmados: Number.MAX_SAFE_INTEGER + 1 },
  { ...dados, receitaTotal: 100000000.29 },
  { ...dados, receitaTotal: "-1.00" },
  { ...dados, receitaTotal: "1.1" },
  { ...dados, receitaTotal: "1.001" },
  { ...dados, receitaTotal: "01.00" },
  { ...dados, receitaTotal: "1e3" },
  { ...dados, receitaTotal: "1,00" },
  { ...dados, atualizadoEm: "ontem" },
  { ...dados, atualizadoEm: "2026-02-30T12:00:00.000Z" },
])("rejeita indicadores invalidos antes de renderizar: %#", async (value) => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json(value));
  await expect(new HttpIndicadoresAdminService().obter()).rejects.toMatchObject(
    { code: "RESPOSTA_INVALIDA" },
  );
});

it.each([
  [401, "NAO_AUTENTICADO"],
  [403, "ACESSO_NEGADO"],
  [503, "SERVICO_INDISPONIVEL"],
])("propaga HTTP %i sem fallback", async (status, code) => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({}, { status: status as number }),
  );
  await expect(new HttpIndicadoresAdminService().obter()).rejects.toMatchObject(
    { code },
  );
});
