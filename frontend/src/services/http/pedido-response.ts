import { ServiceError } from "@/services/errors";
import type {
  DetalhePedido,
  PagamentoPedido,
  PaginaPedidos,
  ResumoPedido,
  StatusPedido,
} from "@/types/pedido";

function invalidar(): never {
  throw new ServiceError("RESPOSTA_INVALIDA", "Resposta de pedido inválida.");
}

function objeto(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidar();
  return value as Record<string, unknown>;
}

function texto(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function data(value: unknown): value is string {
  return texto(value) && Number.isFinite(Date.parse(value));
}

function dinheiro(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 99_999_999.99
  );
}

function centavos(value: number): number {
  return Math.round(value * 100);
}

function lerPagamento(
  value: unknown,
  total: number | null,
): PagamentoPedido | null {
  if (value === null) return null;
  const { id, metodo, status, valor, dataPagamento } = objeto(value);
  if (
    !texto(id) ||
    metodo !== "pix_simulado" ||
    (status !== "aprovado" && status !== "recusado") ||
    !dinheiro(valor) ||
    !data(dataPagamento) ||
    (total !== null && centavos(valor) !== centavos(total))
  )
    invalidar();
  return { id, metodo, status, valor, dataPagamento };
}

export function lerResumoPedido(
  value: unknown,
  pagamento?: unknown,
): ResumoPedido {
  const registro = objeto(value);
  const { id, numero, status, total, criadoEm } = registro;
  if (
    !texto(id) ||
    (numero !== null &&
      (!texto(numero) || !/^ORG-\d{4}-\d{6}$/.test(numero))) ||
    (status !== "pendente" &&
      status !== "confirmado" &&
      status !== "cancelado") ||
    (total !== null && !dinheiro(total)) ||
    !data(criadoEm)
  )
    invalidar();
  return {
    id,
    numeroConfirmacao: numero,
    status: status as StatusPedido,
    total,
    criadoEm,
    pagamento: lerPagamento(
      pagamento === undefined ? registro.pagamento : pagamento,
      total,
    ),
  };
}

export function lerPaginaPedidos(value: unknown): PaginaPedidos {
  const { itens, pagina, limite, total } = objeto(value);
  if (
    !Array.isArray(itens) ||
    typeof pagina !== "number" ||
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 10_000 ||
    typeof limite !== "number" ||
    !Number.isSafeInteger(limite) ||
    limite < 1 ||
    limite > 100 ||
    typeof total !== "number" ||
    !Number.isSafeInteger(total) ||
    total < 0 ||
    itens.length > limite
  )
    invalidar();
  const pedidos = itens.map((item: unknown) => lerResumoPedido(item));
  if (
    new Set(pedidos.map((pedido) => pedido.id)).size !== pedidos.length ||
    pedidos.length > total
  )
    invalidar();
  return { itens: pedidos, pagina, limite, total };
}

export function lerDetalhePedido(value: unknown, id: string): DetalhePedido {
  const registro = objeto(value);
  const resumo = lerResumoPedido(registro.pedido, registro.pagamento);
  if (
    resumo.id.toLowerCase() !== id.toLowerCase() ||
    !Array.isArray(registro.itens)
  )
    invalidar();
  const itens = registro.itens.map((value: unknown) => {
    const { produtoId, nome, quantidade, precoUnitario, subtotal } =
      objeto(value);
    if (
      !texto(produtoId) ||
      !texto(nome) ||
      typeof quantidade !== "number" ||
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1 ||
      (precoUnitario !== null && !dinheiro(precoUnitario)) ||
      (subtotal !== null && !dinheiro(subtotal)) ||
      (precoUnitario !== null &&
        subtotal !== null &&
        centavos(subtotal) !== centavos(precoUnitario) * quantidade)
    )
      invalidar();
    return { produtoId, nome, quantidade, precoUnitario, subtotal };
  });
  if (
    resumo.total !== null &&
    itens.every((item) => item.subtotal !== null) &&
    centavos(resumo.total) !==
      itens.reduce((soma, item) => soma + centavos(item.subtotal ?? 0), 0)
  )
    invalidar();
  return { ...resumo, itens };
}
