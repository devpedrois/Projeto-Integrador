import { TECNICAS_SEED } from "@/fake-api/seeds/tecnicas.seed";
import { REGIOES_SEED } from "@/fake-api/seeds/regioes.seed";
import type { PerfilArtesaoInput } from "@/types/perfil-artesao";

export const HISTORIA_LIMITE_CARACTERES = 1000;

export type CampoPerfilArtesao = keyof PerfilArtesaoInput;

export type ErrosPerfilArtesao = Partial<Record<CampoPerfilArtesao, string>>;

const TECNICA_IDS_VALIDAS = new Set(TECNICAS_SEED.map((tecnica) => tecnica.id));
const REGIAO_IDS_VALIDAS = new Set(REGIOES_SEED.map((regiao) => regiao.id));

export function validarPerfilArtesao(
  input: PerfilArtesaoInput
): ErrosPerfilArtesao {
  const erros: ErrosPerfilArtesao = {};

  const historia = input.historia.trim();
  if (historia.length === 0) {
    erros.historia = "Conte a historia da sua producao.";
  } else if (historia.length > HISTORIA_LIMITE_CARACTERES) {
    erros.historia = `A historia deve ter ate ${HISTORIA_LIMITE_CARACTERES} caracteres.`;
  }

  if (!TECNICA_IDS_VALIDAS.has(input.tecnicaId)) {
    erros.tecnicaId = "Selecione uma tecnica valida.";
  }

  if (!REGIAO_IDS_VALIDAS.has(input.regiaoId)) {
    erros.regiaoId = "Selecione uma regiao valida.";
  }

  if (input.fotoUrl !== undefined && input.fotoUrl.trim().length === 0) {
    erros.fotoUrl = "Informe uma URL valida ou deixe o campo vazio.";
  }

  return erros;
}

export function perfilArtesaoValido(erros: ErrosPerfilArtesao): boolean {
  return Object.keys(erros).length === 0;
}
