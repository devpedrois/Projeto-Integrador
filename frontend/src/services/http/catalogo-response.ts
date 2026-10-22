import { ServiceError } from "@/services/errors";
import type { Produto } from "@/types/produto";
import type { Avaliacao } from "@/types/avaliacao";

export function respostaInvalida(): never {
  throw new ServiceError("RESPOSTA_INVALIDA", "Resposta do serviço inválida.");
}

export function objeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const texto = (value: unknown): value is string => typeof value === "string";
const identidade = (value: unknown): value is string =>
  texto(value) && value.length > 0;
const numero = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const quantidade = (value: unknown): value is number =>
  numero(value) && Number.isSafeInteger(value) && value >= 0;
const nota = (value: unknown): value is number =>
  numero(value) && value >= 0 && value <= 5;
const data = (value: unknown): value is string =>
  texto(value) && Number.isFinite(Date.parse(value));

const camposProduto: {
  [K in keyof Required<Produto>]: (value: unknown) => boolean;
} = {
  id: identidade,
  nome: texto,
  descricao: texto,
  preco: (value) => numero(value) && value >= 0,
  categoriaId: identidade,
  tecnicaId: identidade,
  regiaoId: texto,
  artesaoId: identidade,
  fotos: (value) =>
    Array.isArray(value) &&
    value.every(
      (foto: unknown) =>
        objeto(foto) && texto(foto.url) && quantidade(foto.ordem),
    ),
  quantidadeEstoque: quantidade,
  quantidadeVendida: quantidade,
  notaMedia: nota,
  ativo: (value) => typeof value === "boolean",
  desativadoPorAdmin: (value) =>
    value === undefined || typeof value === "boolean",
  criadoEm: data,
};

export function lerProduto(value: unknown): Produto {
  if (!objeto(value)) return respostaInvalida();
  for (const campo of Object.keys(camposProduto) as (keyof Produto)[]) {
    if (!camposProduto[campo](value[campo])) return respostaInvalida();
  }
  return value as unknown as Produto;
}

export function lerListaProdutos(value: unknown): Produto[] {
  if (!Array.isArray(value)) return respostaInvalida();
  return value.map(lerProduto);
}

export function lerOpcoes(value: unknown): { id: string; nome: string }[] {
  if (!Array.isArray(value)) return respostaInvalida();
  return value.map((item: unknown) => {
    if (!objeto(item) || !identidade(item.id) || !texto(item.nome))
      return respostaInvalida();
    return { id: item.id, nome: item.nome };
  });
}

export interface AvaliacoesResponse {
  itens: Avaliacao[];
  resumo: { media: number; total: number };
}

export function lerAvaliacao(item: unknown, produtoId: string): Avaliacao {
  if (
    !objeto(item) ||
    !identidade(item.id) ||
    item.produtoId !== produtoId ||
    !identidade(item.compradorId) ||
    !quantidade(item.nota) ||
    item.nota < 1 ||
    item.nota > 5 ||
    !data(item.criadoEm) ||
    (item.comentario !== undefined &&
      (!texto(item.comentario) || item.comentario.length > 500))
  )
    return respostaInvalida();
  return {
    id: item.id,
    produtoId,
    compradorId: item.compradorId,
    nota: item.nota,
    ...(item.comentario === undefined
      ? {}
      : { comentario: item.comentario as string }),
    criadoEm: item.criadoEm,
  };
}

export function lerAvaliacoes(
  value: unknown,
  produtoId: string,
): AvaliacoesResponse {
  if (
    !objeto(value) ||
    !Array.isArray(value.itens) ||
    !objeto(value.resumo) ||
    !nota(value.resumo.media) ||
    !quantidade(value.resumo.total)
  )
    return respostaInvalida();
  const itens = value.itens.map((item: unknown) =>
    lerAvaliacao(item, produtoId),
  );
  if (value.resumo.total !== itens.length) return respostaInvalida();
  return {
    itens,
    resumo: { media: value.resumo.media, total: value.resumo.total },
  };
}
