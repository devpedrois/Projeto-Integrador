export function formatarPrecoCampo(valor: number): string {
  return valor.toFixed(2).replace(".", ",");
}

export function lerPrecoCampo(texto: string): number {
  const limpo = texto.trim();
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  return Number(normalizado);
}