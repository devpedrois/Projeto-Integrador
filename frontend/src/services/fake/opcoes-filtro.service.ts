import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import { TECNICAS_SEED } from "@/fake-api/seeds/tecnicas.seed";
import { REGIOES_SEED } from "@/fake-api/seeds/regioes.seed";
import type { Categoria } from "@/types/categoria";
import type { Tecnica } from "@/types/tecnica";
import type { Regiao } from "@/types/regiao";

export interface FakeOpcoesFiltroServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakeOpcoesFiltroService implements OpcoesFiltroService {
  private readonly latenciaMs: number;

  constructor(opcoes: FakeOpcoesFiltroServiceOpcoes = {}) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async categorias(): Promise<readonly Categoria[]> {
    await aguardar(this.latenciaMs);
    return CATEGORIAS_SEED;
  }

  async tecnicas(): Promise<readonly Tecnica[]> {
    await aguardar(this.latenciaMs);
    return TECNICAS_SEED;
  }

  async regioes(): Promise<readonly Regiao[]> {
    await aguardar(this.latenciaMs);
    return REGIOES_SEED;
  }
}
