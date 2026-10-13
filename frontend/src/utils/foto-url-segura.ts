import { caminhoLocalSeguro } from "@/utils/rota-segura";

function urlHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function fotoUrlAceita(url: string): boolean {
  return caminhoLocalSeguro(url) || urlHttps(url);
}

export function fotoUrlSegura(url: string | undefined): string | null {
  if (!url) return null;
  return fotoUrlAceita(url) ? url : null;
}
