import type { Prisma, PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import { mapearProdutoDTO, type ProdutoDTO } from "../utils/produto-dto.js";
import type {
  ProdutoCreate,
  ProdutoPatch,
} from "../validators/gestao-produtos.validator.js";

const include = {
  fotos: { orderBy: { ordem: "asc" } },
  artesao: { select: { perfilArtesao: { select: { regiaoId: true } } } },
  avaliacoes: { select: { nota: true } },
  itensPedido: {
    where: { pedido: { status: "confirmado" } },
    select: { quantidade: true },
  },
} satisfies Prisma.ProdutoInclude;
type Registro = Prisma.ProdutoGetPayload<{ include: typeof include }>;
function dto(produto: Registro): ProdutoDTO {
  return mapearProdutoDTO({
    ...produto,
    regiaoId: produto.artesao.perfilArtesao?.regiaoId ?? "",
    notaMedia: produto.avaliacoes.length
      ? produto.avaliacoes.reduce((s, a) => s + a.nota, 0) /
        produto.avaliacoes.length
      : 0,
    quantidadeVendida: produto.itensPedido.reduce(
      (s, item) => s + item.quantidade,
      0,
    ),
  });
}
const usuarioSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  ativo: true,
} satisfies Prisma.UsuarioSelect;
export type ArtesaoModeracao = Prisma.UsuarioGetPayload<{
  select: typeof usuarioSelect;
}>;
export interface GestaoProdutosRepository {
  listar(artesaoId?: string): Promise<ProdutoDTO[]>;
  criar(input: ProdutoCreate, artesaoId: string): Promise<ProdutoDTO>;
  atualizar(
    id: string,
    preparar: (atual: ProdutoDTO) => ProdutoPatch,
  ): Promise<ProdutoDTO>;
  moderarProduto(id: string, ativo: boolean): Promise<ProdutoDTO>;
  listarArtesaos(): Promise<ArtesaoModeracao[]>;
  moderarArtesao(id: string, ativo: boolean): Promise<ArtesaoModeracao>;
}

export class PrismaGestaoProdutosRepository implements GestaoProdutosRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async listar(artesaoId?: string) {
    const registros = await this.prisma.produto.findMany({
      where: artesaoId ? { artesaoId } : {},
      include,
      orderBy: [{ criadoEm: "desc" }, { id: "asc" }],
    });
    return registros.map(dto);
  }
  private async validarReferencias(
    tx: Prisma.TransactionClient,
    input: ProdutoPatch,
  ) {
    if (
      input.categoriaId &&
      !(await tx.categoria.findUnique({
        where: { id: input.categoriaId },
        select: { id: true },
      }))
    )
      throw new AppError(400, "VALIDACAO", "Categoria invalida.");
    if (
      input.tecnicaId &&
      !(await tx.tecnica.findUnique({
        where: { id: input.tecnicaId },
        select: { id: true },
      }))
    )
      throw new AppError(400, "VALIDACAO", "Tecnica invalida.");
  }
  async criar(input: ProdutoCreate, artesaoId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${artesaoId}::uuid FOR UPDATE`;
      const usuario = await tx.usuario.findFirst({
        where: { id: artesaoId, ativo: true, papel: "artesao" },
        select: { perfilArtesao: { select: { tecnicaPrincipalId: true } } },
      });
      if (!usuario)
        throw new AppError(401, "NAO_AUTENTICADO", "Sessao invalida.");
      const tecnicaId =
        input.tecnicaId ?? usuario.perfilArtesao?.tecnicaPrincipalId;
      if (!tecnicaId)
        throw new AppError(
          400,
          "VALIDACAO",
          "Informe a tecnica no perfil do artesao.",
        );
      await this.validarReferencias(tx, { ...input, tecnicaId });
      const { fotos, ...campos } = input;
      return dto(
        await tx.produto.create({
          data: {
            ...campos,
            tecnicaId,
            artesaoId,
            fotos: { create: fotos.map((foto, ordem) => ({ ...foto, ordem })) },
          },
          include,
        }),
      );
    });
  }
  async atualizar(id: string, preparar: (atual: ProdutoDTO) => ProdutoPatch) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Produto" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const atual = await tx.produto.findUnique({ where: { id }, include });
      if (!atual)
        throw new AppError(
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Produto nao encontrado.",
        );
      const input = preparar(dto(atual));
      await this.validarReferencias(tx, input);
      const { fotos, ...campos } = input;
      const data: Prisma.ProdutoUncheckedUpdateInput = {};
      if (campos.nome !== undefined) data.nome = campos.nome;
      if (campos.descricao !== undefined) data.descricao = campos.descricao;
      if (campos.preco !== undefined) data.preco = campos.preco;
      if (campos.categoriaId !== undefined)
        data.categoriaId = campos.categoriaId;
      if (campos.tecnicaId !== undefined) data.tecnicaId = campos.tecnicaId;
      if (campos.quantidadeEstoque !== undefined)
        data.quantidadeEstoque = campos.quantidadeEstoque;
      if (campos.ativo !== undefined) data.ativo = campos.ativo;
      if (fotos)
        data.fotos = {
          deleteMany: {},
          create: fotos.map((foto, ordem) => ({ ...foto, ordem })),
        };
      return dto(await tx.produto.update({ where: { id }, data, include }));
    });
  }
  async moderarProduto(id: string, ativo: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Produto" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (
        !(await tx.produto.findUnique({ where: { id }, select: { id: true } }))
      )
        throw new AppError(
          404,
          "PRODUTO_NAO_ENCONTRADO",
          "Produto nao encontrado.",
        );
      return dto(
        await tx.produto.update({
          where: { id },
          data: { desativadoPorAdmin: !ativo },
          include,
        }),
      );
    });
  }
  listarArtesaos() {
    return this.prisma.usuario.findMany({
      where: { papel: "artesao" },
      select: usuarioSelect,
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    });
  }
  async moderarArtesao(id: string, ativo: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${id}::uuid FOR UPDATE`;
      if (
        !(await tx.usuario.findFirst({
          where: { id, papel: "artesao" },
          select: { id: true },
        }))
      )
        throw new AppError(
          404,
          "ARTESAO_NAO_ENCONTRADO",
          "Artesao nao encontrado.",
        );
      return tx.usuario.update({
        where: { id },
        data: { ativo },
        select: usuarioSelect,
      });
    });
  }
}
