const DESTINO_PADRAO = "/";

export function paraDestinoSeguro(destino: string | null | undefined): string {
  if (!destino) return DESTINO_PADRAO;
  if (!destino.startsWith("/")) return DESTINO_PADRAO;
  if (destino.startsWith("//")) return DESTINO_PADRAO;
  if (destino.includes("://")) return DESTINO_PADRAO;
  return destino;
}
