import type { PerfilArtesaoRepository } from "@/fake-api/repositories/perfil-artesao.repository";
import type { PerfilArtesao, PerfilArtesaoInput } from "@/types/perfil-artesao";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import { ServiceError } from "@/services/errors";
import {
  perfilArtesaoValido,
  validarPerfilArtesao,
} from "@/validators/perfil-artesao.validator";

export interface FakePerfilArtesaoServiceOpcoes {
  latenciaMs?: number;
}

function aguardar(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class FakePerfilArtesaoService implements PerfilArtesaoService {
  private readonly latenciaMs: number;

  constructor(
    private readonly repositorio: PerfilArtesaoRepository,
    opcoes: FakePerfilArtesaoServiceOpcoes = {}
  ) {
    this.latenciaMs = opcoes.latenciaMs ?? 0;
  }

  async obter(artesaoId: string): Promise<PerfilArtesao | null> {
    await this.repositorio.seed();
    await aguardar(this.latenciaMs);
    return this.repositorio.findByArtesaoId(artesaoId);
  }

  async salvar(input: PerfilArtesaoInput, artesaoId: string): Promise<PerfilArtesao> {
    const erros = validarPerfilArtesao(input);
    if (!perfilArtesaoValido(erros)) {
      throw new ServiceError("PERFIL_ARTESAO_INVALIDO", "Dados do perfil invalidos.");
    }

    await this.repositorio.seed();
    await aguardar(this.latenciaMs);

    const perfil: PerfilArtesao = {
      artesaoId,
      historia: input.historia.trim(),
      tecnicaId: input.tecnicaId,
      regiaoId: input.regiaoId,
      ...(input.fotoUrl !== undefined ? { fotoUrl: input.fotoUrl.trim() } : {}),
    };

    return this.repositorio.upsert(perfil);
  }
}
