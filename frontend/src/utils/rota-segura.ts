const DESTINO_PADRAO = "/";
function temCaractereControle(valor: string): boolean {
  return [...valor].some((caractere) => {
    const codigo = caractere.charCodeAt(0);
    return codigo <= 0x1f || codigo === 0x7f;
  });
}

function decodificar(valor: string): string | null {
  try {
    return decodeURIComponent(valor);
  } catch {
    return null;
  }
}

function formaLocalValida(valor: string): boolean {
  if (!valor.startsWith("/")) return false;
  if (valor.startsWith("//")) return false;
  if (valor.includes("\\")) return false;
  if (temCaractereControle(valor)) return false;
  if (valor.includes("://")) return false;
  return true;
}

export function caminhoLocalSeguro(valor: string): boolean {
  const decodificado = decodificar(valor);
  if (decodificado === null) return false;
  return formaLocalValida(valor) && formaLocalValida(decodificado);
}

export function paraDestinoSeguro(destino: string | null | undefined): string {
  if (!destino) return DESTINO_PADRAO;
  return caminhoLocalSeguro(destino) ? destino : DESTINO_PADRAO;
}
