import type { Prisma } from "../generated/prisma/client.js";

export interface ProdutoDTO {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoriaId: string;
  tecnicaId: string;
  regiaoId: string;
  artesaoId: string;
  fotos: { url: string; ordem: number }[];
  quantidadeEstoque: number;
  quantidadeVendida: number;
  notaMedia: number;
  ativo: boolean;
  desativadoPorAdmin: boolean;
  criadoEm: string;
}

export interface ProdutoDTOOrigem extends Omit<
  ProdutoDTO,
  "preco" | "criadoEm"
> {
  preco: Prisma.Decimal;
  criadoEm: Date;
}

export function mapearProdutoDTO(produto: ProdutoDTOOrigem): ProdutoDTO {
  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    preco: produto.preco.toNumber(),
    categoriaId: produto.categoriaId,
    tecnicaId: produto.tecnicaId,
    regiaoId: produto.regiaoId,
    artesaoId: produto.artesaoId,
    fotos: produto.fotos.map(({ url, ordem }) => ({ url, ordem })),
    quantidadeEstoque: produto.quantidadeEstoque,
    quantidadeVendida: produto.quantidadeVendida,
    notaMedia: Math.round(produto.notaMedia * 10) / 10,
    ativo: produto.ativo,
    desativadoPorAdmin: produto.desativadoPorAdmin,
    criadoEm: produto.criadoEm.toISOString(),
  };
}
