import type { IndicadoresRepository } from "../repositories/indicadores.repository.js";

export class IndicadoresService {
  constructor(private readonly repository: IndicadoresRepository) {}

  async obter(artesaoId: string) {
    const indicadores = await this.repository.obterDoArtesao(artesaoId);
    return {
      ...indicadores,
      ultimaVenda: indicadores.ultimaVenda?.toISOString() ?? null,
      atualizadoEm: indicadores.atualizadoEm.toISOString(),
    };
  }
}
