import { CATEGORIAS_SEED } from "@/fake-api/seeds/categorias.seed";
import type { NovoProdutoInput } from "@/types/novo-produto";

export type CampoProduto = keyof NovoProdutoInput;

export type ErrosProduto = Partial<Record<CampoProduto, string>>;

const CATEGORIA_IDS_VALIDAS = new Set(
  CATEGORIAS_SEED.map((categoria) => categoria.id)
);

export function validarProduto(input: NovoProdutoInput): ErrosProduto {
  const erros: ErrosProduto = {};

  if (input.nome.trim().length < 3) {
    erros.nome = "Informe um nome com ao menos 3 caracteres.";
  }

  if (input.descricao.trim().length < 10) {
    erros.descricao = "Informe uma descrição com ao menos 10 caracteres.";
  }

  if (!Number.isFinite(input.preco) || input.preco <= 0) {
    erros.preco = "Informe um preço maior que zero.";
  }

  if (!CATEGORIA_IDS_VALIDAS.has(input.categoriaId)) {
    erros.categoriaId = "Selecione uma categoria válida.";
  }

  if (
    input.fotos.length === 0 ||
    input.fotos.some((foto) => foto.url.trim().length === 0)
  ) {
    erros.fotos = "Informe ao menos uma foto válida.";
  }

  if (
    !Number.isInteger(input.quantidadeEstoque) ||
    input.quantidadeEstoque < 0
  ) {
    erros.quantidadeEstoque = "Informe um estoque inteiro não negativo.";
  }

  return erros;
}

export function produtoValido(erros: ErrosProduto): boolean {
  return Object.keys(erros).length === 0;
}
