import type { PerfilArtesao } from "@/types/perfil-artesao";
import { PERFIS_ARTESAO_SEED } from "@/fake-api/seeds/perfis-artesao.seed";

const CHAVE_PADRAO = "origem:v1:perfis-artesao";

export interface PerfilArtesaoRepository {
  seed(): Promise<void>;
  list(): Promise<PerfilArtesao[]>;
  findByArtesaoId(artesaoId: string): Promise<PerfilArtesao | null>;
  upsert(perfil: PerfilArtesao): Promise<PerfilArtesao>;
}

export class BrowserPerfilArtesaoRepository implements PerfilArtesaoRepository {
  constructor(
    private readonly storage: Storage,
    private readonly chave: string = CHAVE_PADRAO
  ) {}

  async seed(): Promise<void> {
    if (this.storage.getItem(this.chave) !== null) return;
    this.storage.setItem(this.chave, JSON.stringify(PERFIS_ARTESAO_SEED));
  }

  async list(): Promise<PerfilArtesao[]> {
    const bruto = this.storage.getItem(this.chave);
    if (bruto === null) return [];
    return JSON.parse(bruto) as PerfilArtesao[];
  }

  async findByArtesaoId(artesaoId: string): Promise<PerfilArtesao | null> {
    const perfis = await this.list();
    return perfis.find((perfil) => perfil.artesaoId === artesaoId) ?? null;
  }

  async upsert(perfil: PerfilArtesao): Promise<PerfilArtesao> {
    const perfis = await this.list();
    const indice = perfis.findIndex((atual) => atual.artesaoId === perfil.artesaoId);

    if (indice === -1) {
      perfis.push(perfil);
    } else {
      perfis[indice] = perfil;
    }

    this.storage.setItem(this.chave, JSON.stringify(perfis));
    return perfil;
  }
}
