function caminhoRelativoLocal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}

export function fotoUrlSegura(url: string | undefined): string | null {
  if (!url) return null;
  if (caminhoRelativoLocal(url)) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
