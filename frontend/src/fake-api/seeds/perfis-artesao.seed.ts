import type { PerfilArtesao } from "@/types/perfil-artesao";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";

export const PERFIS_ARTESAO_SEED: readonly PerfilArtesao[] = [
  {
    artesaoId: "seed-artesao-01",
    historia:
      "Joao aprendeu marcenaria artesanal observando o pai na Comunidade do Pilar. Cada peca carrega tecnicas passadas por tres geracoes.",
    tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    regiaoId: REGIAO_IDS.pilarRecife,
    fotoUrl: "https://origem.test/perfis/joao-artesao.jpg",
  },
  {
    artesaoId: "seed-artesao-02",
    historia: "Maria produz pecas de ceramica na regiao de Caruaru.",
    tecnicaId: TECNICA_IDS.modelagemArgila,
    regiaoId: "",
  },
];
