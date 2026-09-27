import type { PerfilArtesao } from "@/types/perfil-artesao";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";

export const PERFIS_ARTESAO_SEED: readonly PerfilArtesao[] = [
  {
    artesaoId: "seed-artesao-01",
    historia:
      "João aprendeu marcenaria artesanal observando o pai na Comunidade do Pilar. Cada peça carrega técnicas passadas por três gerações.",
    tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    regiaoId: REGIAO_IDS.pilarRecife,
    fotoUrl: "/imagens/entalhe-luz.webp",
  },
  {
    artesaoId: "seed-artesao-02",
    historia: "Maria produz peças de cerâmica na região de Caruaru.",
    tecnicaId: TECNICA_IDS.modelagemArgila,
    regiaoId: "",
  },
];
