import { caminhoLocalSeguro } from "@/utils/rota-segura";

export function fotoUrlSegura(url: string | undefined): string | null {
  if (!url) return null;
  if (caminhoLocalSeguro(url)) return url;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
