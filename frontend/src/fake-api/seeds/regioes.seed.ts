import type { Regiao } from "@/types/regiao";

export const REGIAO_IDS = {
  pilarRecife: "regiao-pilar-recife",
  altoMouraCaruaru: "regiao-alto-moura-caruaru",
  tracunhaem: "regiao-tracunhaem",
} as const;

export const REGIOES_SEED: readonly Regiao[] = [
  { id: REGIAO_IDS.pilarRecife, nome: "Comunidade do Pilar - Recife" },
  { id: REGIAO_IDS.altoMouraCaruaru, nome: "Alto do Moura - Caruaru" },
  { id: REGIAO_IDS.tracunhaem, nome: "Tracunhaem" },
];
