import type { AvaliacaoRepository } from "../repositories/avaliacao.repository.js";
import type { CriarAvaliacaoInput } from "../validators/avaliacao.validator.js";
import type { CachePublico } from "../utils/cache.js";

export class AvaliacaoService {
  constructor(
    private readonly repository: AvaliacaoRepository,
    private readonly cache: CachePublico,
  ) {}

  async criar(input: CriarAvaliacaoInput, compradorId: string) {
    const avaliacao = await this.repository.criar(input, compradorId);
    await this.cache.invalidarCatalogo();
    return avaliacao;
  }
}
