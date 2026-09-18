import type { Categoria } from "@/types/categoria";

export const CATEGORIA_IDS = {
  ceramicaBarro: "categoria-ceramica-barro",
  rendaBordado: "categoria-renda-bordado",
  madeiraEntalhada: "categoria-madeira-entalhada",
  textilCostura: "categoria-textil-costura",
  bijuteriaAcessorios: "categoria-bijuteria-acessorios",
  arteReciclada: "categoria-arte-reciclada",
} as const;

export const CATEGORIAS_SEED: readonly Categoria[] = [
  { id: CATEGORIA_IDS.ceramicaBarro, nome: "Ceramica e Barro" },
  { id: CATEGORIA_IDS.rendaBordado, nome: "Renda e Bordado" },
  {
    id: CATEGORIA_IDS.madeiraEntalhada,
    nome: "Madeira Entalhada e Marcenaria Artesanal",
  },
  { id: CATEGORIA_IDS.textilCostura, nome: "Textil e Costura Autoral" },
  {
    id: CATEGORIA_IDS.bijuteriaAcessorios,
    nome: "Bijuteria e Acessorios Artesanais",
  },
  { id: CATEGORIA_IDS.arteReciclada, nome: "Arte Reciclada e Sustentavel" },
];
