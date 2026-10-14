import { AppError } from "../errors/app-error.js";
import type { CachePublico } from "../utils/cache.js";
import { verificarPerfilCompleto } from "../domain/perfil-artesao-completo.js";
import type { PerfilArtesaoRepository } from "../repositories/perfil-artesao.repository.js";
import type { PerfilArtesaoPatch } from "../validators/perfil-artesao.validator.js";

export class PerfilArtesaoService {
  constructor(
    private readonly repository: PerfilArtesaoRepository,
    private readonly cache?: CachePublico,
  ) {}

  async obter(id: string) {
    const perfil = await this.repository.obter(id);
    if (!perfil)
      throw new AppError(
        404,
        "ARTESAO_NAO_ENCONTRADO",
        "Artesao nao encontrado.",
      );
    return perfil;
  }
  async salvar(id: string, input: PerfilArtesaoPatch, usuarioId: string) {
    if (id.toLowerCase() !== usuarioId.toLowerCase())
      throw new AppError(403, "ACESSO_NEGADO", "Acesso negado.");
    const [tecnicaValida, regiaoValida] = await Promise.all([
      input.tecnicaId ? this.repository.tecnicaExiste(input.tecnicaId) : true,
      input.regiaoId ? this.repository.regiaoExiste(input.regiaoId) : true,
    ]);
    if (!tecnicaValida || !regiaoValida)
      throw new AppError(400, "VALIDACAO", "Dados do perfil invalidos.");
    const resultado = await this.repository.atualizar(id, (atual) => {
      const fotoUrl = input.fotoUrl ?? atual.fotoUrl;
      const perfil = {
        artesaoId: atual.artesaoId,
        nome: atual.nome,
        historia: input.historia ?? atual.historia,
        tecnicaId: input.tecnicaId ?? atual.tecnicaId,
        regiaoId: input.regiaoId ?? atual.regiaoId,
        ...(fotoUrl ? { fotoUrl } : {}),
      };
      return { ...perfil, completo: verificarPerfilCompleto(perfil).completo };
    });
    await this.cache?.invalidarCatalogo();
    return resultado;
  }
}
