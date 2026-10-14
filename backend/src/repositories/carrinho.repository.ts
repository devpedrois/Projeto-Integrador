import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";

export interface CarrinhoDTO {
  itens: {
    produtoId: string;
    nome: string;
    precoUnitario: number;
    quantidade: number;
    estoqueDisponivel: number;
  }[];
  total: number;
  atualizadoEm: string;
}
interface ProdutoCarrinho {
  id: string;
  nome: string;
  quantidadeEstoque: number;
}
export interface CarrinhoRepository {
  obter(usuarioId: string): Promise<CarrinhoDTO>;
  salvar(
    usuarioId: string,
    produtoId: string,
    calcular: (produto: ProdutoCarrinho, existente: number) => number,
  ): Promise<CarrinhoDTO>;
  remover(usuarioId: string, produtoId: string): Promise<CarrinhoDTO>;
}
async function obterDTO(
  tx: Prisma.TransactionClient,
  usuarioId: string,
): Promise<CarrinhoDTO> {
  const carrinho = await tx.carrinho.findUniqueOrThrow({
    where: { usuarioId },
    include: {
      itens: {
        orderBy: { id: "asc" },
        include: {
          produto: {
            include: { artesao: { select: { ativo: true, papel: true } } },
          },
        },
      },
    },
  });
  const itens = carrinho.itens.map((item) => ({
    produtoId: item.produtoId,
    nome: item.produto.nome,
    precoUnitario: Number(item.precoUnitario),
    quantidade: item.quantidade,
    estoqueDisponivel:
      item.produto.ativo &&
      !item.produto.desativadoPorAdmin &&
      item.produto.artesao.ativo &&
      item.produto.artesao.papel === "artesao"
        ? item.produto.quantidadeEstoque
        : 0,
  }));
  return {
    itens,
    total:
      itens.reduce(
        (total, item) =>
          total + Math.round(item.precoUnitario * 100) * item.quantidade,
        0,
      ) / 100,
    atualizadoEm: carrinho.atualizadoEm.toISOString(),
  };
}
export class PrismaCarrinhoRepository implements CarrinhoRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private async bloquear(
    tx: Prisma.TransactionClient,
    usuarioId: string,
  ): Promise<void> {
    await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${usuarioId}::uuid FOR NO KEY UPDATE`;
    await tx.carrinho.upsert({
      where: { usuarioId },
      create: { usuarioId },
      update: {},
    });
  }
  obter(usuarioId: string): Promise<CarrinhoDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      return obterDTO(tx, usuarioId);
    });
  }
  salvar(
    usuarioId: string,
    produtoId: string,
    calcular: (produto: ProdutoCarrinho, existente: number) => number,
  ): Promise<CarrinhoDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      await tx.$queryRaw`SELECT "id" FROM "Produto" WHERE "id" = ${produtoId}::uuid FOR UPDATE`;
      const produto = await tx.produto.findFirst({
        where: {
          id: produtoId,
          ativo: true,
          desativadoPorAdmin: false,
          quantidadeEstoque: { gt: 0 },
          artesao: { ativo: true, papel: "artesao" },
        },
        select: { id: true, nome: true, quantidadeEstoque: true, preco: true },
      });
      if (!produto)
        throw new AppError(
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Produto nao encontrado.",
        );
      const where = {
        carrinhoId_produtoId: { carrinhoId: usuarioId, produtoId },
      };
      const item = await tx.itemCarrinho.findUnique({ where });
      const quantidade = calcular(produto, item?.quantidade ?? 0);
      await tx.itemCarrinho.upsert({
        where,
        create: {
          carrinhoId: usuarioId,
          produtoId,
          quantidade,
          precoUnitario: produto.preco,
        },
        update: { quantidade, precoUnitario: produto.preco },
      });
      await tx.carrinho.update({
        where: { usuarioId },
        data: { atualizadoEm: new Date() },
      });
      return obterDTO(tx, usuarioId);
    });
  }
  remover(usuarioId: string, produtoId: string): Promise<CarrinhoDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquear(tx, usuarioId);
      const result = await tx.itemCarrinho.deleteMany({
        where: { carrinhoId: usuarioId, produtoId },
      });
      if (result.count === 0)
        throw new AppError(
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Item nao encontrado.",
        );
      await tx.carrinho.update({
        where: { usuarioId },
        data: { atualizadoEm: new Date() },
      });
      return obterDTO(tx, usuarioId);
    });
  }
}
