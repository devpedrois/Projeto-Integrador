import type { IndicadoresPlataformaRepository } from "../repositories/indicadores-plataforma.repository.js";

export class IndicadoresAdminService {
  constructor(private readonly repository: IndicadoresPlataformaRepository) {}

  async obter() {
    const indicadores = await this.repository.obterDaPlataforma();
    return {
      ...indicadores,
      receitaTotal: indicadores.receitaTotal.toFixed(2),
      atualizadoEm: new Date().toISOString(),
    };
  }
}
