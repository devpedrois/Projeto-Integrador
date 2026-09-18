import type { Tecnica } from "@/types/tecnica";

export const TECNICA_IDS = {
  modelagemArgila: "tecnica-modelagem-argila",
  tornoCeramico: "tecnica-torno-ceramico",
  rendaIrlandesa: "tecnica-renda-irlandesa",
  bordadoMao: "tecnica-bordado-mao",
  entalheMadeira: "tecnica-entalhe-madeira",
  marcenariaArtesanal: "tecnica-marcenaria-artesanal",
  costuraAutoral: "tecnica-costura-autoral",
  tecelagemManual: "tecnica-tecelagem-manual",
  bijuteriaSementes: "tecnica-bijuteria-sementes",
  trancadoFibra: "tecnica-trancado-fibra",
} as const;

export const TECNICAS_SEED: readonly Tecnica[] = [
  { id: TECNICA_IDS.modelagemArgila, nome: "Modelagem em Argila" },
  { id: TECNICA_IDS.tornoCeramico, nome: "Torno Ceramico" },
  { id: TECNICA_IDS.rendaIrlandesa, nome: "Renda Irlandesa" },
  { id: TECNICA_IDS.bordadoMao, nome: "Bordado a Mao" },
  { id: TECNICA_IDS.entalheMadeira, nome: "Entalhe em Madeira" },
  { id: TECNICA_IDS.marcenariaArtesanal, nome: "Marcenaria Artesanal" },
  { id: TECNICA_IDS.costuraAutoral, nome: "Costura Autoral" },
  { id: TECNICA_IDS.tecelagemManual, nome: "Tecelagem Manual" },
  { id: TECNICA_IDS.bijuteriaSementes, nome: "Bijuteria em Sementes Naturais" },
  { id: TECNICA_IDS.trancadoFibra, nome: "Trancado em Fibra Natural" },
];
