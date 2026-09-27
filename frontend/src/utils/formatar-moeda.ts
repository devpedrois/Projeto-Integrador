const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoeda(valor: number): string {
  return FORMATADOR_MOEDA.format(valor);
}
