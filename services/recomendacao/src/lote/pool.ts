export async function executarPool<T, R>(
  itens: readonly T[],
  concorrencia: number,
  tarefa: (item: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concorrencia) || concorrencia < 1 || concorrencia > 8)
    throw new Error("concorrencia invalida.");
  const resultados: R[] = new Array<R>(itens.length);
  let proximo = 0;
  let falhou = false;
  let falha: unknown;
  async function consumir() {
    while (!falhou && proximo < itens.length) {
      const indice = proximo++;
      const item = itens[indice];
      if (item === undefined) throw new Error("item ausente.");
      try {
        resultados[indice] = await tarefa(item);
      } catch (error) {
        if (!falhou) falha = error;
        falhou = true;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concorrencia, itens.length) }, consumir),
  );
  if (falhou) throw falha;
  return resultados;
}
