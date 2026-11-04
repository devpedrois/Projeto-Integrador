const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarMoedaDecimal(valor: string): string {
  const inteiro = BigInt(valor.slice(0, -3));
  const centavos = valor.slice(-2);
  return FORMATADOR_MOEDA.formatToParts(inteiro)
    .map((parte) => (parte.type === "fraction" ? centavos : parte.value))
    .join("");
}
