export function ehObjeto(valor: unknown): valor is object {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function interpretarLista<T>(bruto: string): T[] | null {
  try {
    const valor: unknown = JSON.parse(bruto);
    return Array.isArray(valor) ? (valor.filter(ehObjeto) as T[]) : null;
  } catch {
    return null;
  }
}

export function lerListaPersistida<T>(storage: Storage, chave: string): T[] | null {
  const bruto = storage.getItem(chave);
  if (bruto === null) return null;
  const lista = interpretarLista<T>(bruto);
  if (lista === null) storage.removeItem(chave);
  return lista;
}
