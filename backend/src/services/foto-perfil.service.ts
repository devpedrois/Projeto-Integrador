import { randomUUID } from "node:crypto";
import type { FotoStorage } from "../integrations/storage/foto-storage.js";
import type { PerfilArtesaoRepository } from "../repositories/perfil-artesao.repository.js";
import type { CachePublico } from "../utils/cache.js";

export class FotoPerfilService {
  constructor(
    private readonly repository: PerfilArtesaoRepository,
    private readonly storage: FotoStorage,
    private readonly cache: CachePublico,
  ) {}

  async salvar(usuarioId: string, bytes: Buffer, mime: string) {
    const caminho = `perfis/${usuarioId}/${randomUUID()}.${mime === "image/png" ? "png" : "jpg"}`;
    const url = await this.storage.salvar(caminho, bytes, mime);
    let anterior: string | undefined;
    let resultado;
    try {
      resultado = await this.repository.atualizar(usuarioId, (atual) => {
        anterior = atual.fotoUrl;
        return { ...atual, fotoUrl: url };
      });
    } catch (error: unknown) {
      await this.storage.remover(url);
      throw error;
    }
    await this.cache.invalidarCatalogo();
    if (anterior) {
      const nova = new URL(url);
      const antiga = new URL(anterior, nova.origin);
      const prefixo = `/perfis/${usuarioId}/`;
      if (
        antiga.origin === nova.origin &&
        antiga.pathname.startsWith(prefixo) &&
        /^[a-f0-9-]{36}\.(jpg|png)$/.test(
          antiga.pathname.slice(prefixo.length),
        ) &&
        !antiga.search &&
        !antiga.hash
      ) {
        await this.storage.remover(anterior);
      }
    }
    return resultado;
  }
}
