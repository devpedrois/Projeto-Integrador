const DIACRITICOS = /[̀-ͯ]/g;
const ESPACOS_MULTIPLOS = /\s+/g;

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .toLowerCase()
    .trim()
    .replace(ESPACOS_MULTIPLOS, " ");
}
