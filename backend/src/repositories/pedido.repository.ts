import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";
import { AppError } from "../errors/app-error.js";
import type { CriarPedidoInput } from "../validators/pedido.validator.js";
import type { PaginacaoPedidos } from "../validators/pedido.validator.js";

const resumoPedidoSelect = {
  id: true,
  numero: true,
  total: true,
  status: true,
  criadoEm: true,
  pagamento: {
    select: {
      id: true,
      metodo: true,
      valor: true,
      status: true,
      dataPagamento: true,
    },
  },
} satisfies Prisma.PedidoSelect;

type RegistroResumo = Prisma.PedidoGetPayload<{
  select: typeof resumoPedidoSelect;
}>;

export interface ResumoPedido {
  id: string;
  numero: string | null;
  total: number | null;
  status: RegistroResumo["status"];
  criadoEm: string;
  pagamento: {
    id: string;
    metodo: "pix_simulado";
    valor: number;
    status: "aprovado" | "recusado";
    dataPagamento: string;
  } | null;
}

export interface PaginaPedidos extends PaginacaoPedidos {
  itens: ResumoPedido[];
  total: number;
}

export interface DetalhePedido extends ResumoPedido {
  compradorId: string;
  itens: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number | null;
    subtotal: number | null;
  }>;
}

function mapearResumo(registro: RegistroResumo): ResumoPedido {
  const pagamento = registro.pagamento;
  return {
    id: registro.id,
    numero: registro.numero,
    total: registro.total?.toNumber() ?? null,
    status: registro.status,
    criadoEm: registro.criadoEm.toISOString(),
    pagamento: pagamento
      ? {
          id: pagamento.id,
          metodo: pagamento.metodo,
          status: pagamento.status,
          valor: pagamento.valor.toNumber(),
          dataPagamento: pagamento.dataPagamento.toISOString(),
        }
      : null,
  };
}

export interface PedidoCriado {
  pedidoId: string;
  compradorId: string;
  numero: string;
  total: number;
  status: "confirmado";
  criadoEm: string;
  itens: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
  }>;
}

export interface NovoPedido extends CriarPedidoInput {
  compradorId: string;
}

export interface PedidoRepository {
  criar(input: NovoPedido): Promise<PedidoCriado>;
  listarMeus(
    compradorId: string,
    paginacao: PaginacaoPedidos,
  ): Promise<PaginaPedidos>;
  obter(id: string, compradorId: string): Promise<DetalhePedido | null>;
}

interface EstoqueRow {
  nome: string;
  preco: string;
  quantidadeEstoque: number;
  ativo: boolean;
  desativadoPorAdmin: boolean;
  artesaoAtivo: boolean;
  papelArtesao: string;
}

export class PrismaPedidoRepository implements PedidoRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async listarMeus(
    compradorId: string,
    paginacao: PaginacaoPedidos,
  ): Promise<PaginaPedidos> {
    const { pagina, limite } = paginacao;
    const where = { compradorId };
    const [registros, total] = await this.prisma.$transaction(
      [
        this.prisma.pedido.findMany({
          where,
          select: resumoPedidoSelect,
          orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
          skip: (pagina - 1) * limite,
          take: limite,
        }),
        this.prisma.pedido.count({ where }),
      ],
      { isolationLevel: "RepeatableRead" },
    );
    return { itens: registros.map(mapearResumo), pagina, limite, total };
  }

  public async obter(
    id: string,
    compradorId: string,
  ): Promise<DetalhePedido | null> {
    const registro = await this.prisma.pedido.findFirst({
      where: { id, compradorId },
      select: {
        ...resumoPedidoSelect,
        compradorId: true,
        itens: {
          orderBy: { id: "asc" },
          select: {
            produtoId: true,
            quantidade: true,
            precoUnitario: true,
            subtotal: true,
            produto: { select: { nome: true } },
          },
        },
      },
    });
    if (!registro) return null;
    return {
      ...mapearResumo(registro),
      compradorId: registro.compradorId,
      itens: registro.itens.map((item) => ({
        produtoId: item.produtoId,
        nome: item.produto.nome,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario?.toNumber() ?? null,
        subtotal: item.subtotal?.toNumber() ?? null,
      })),
    };
  }

  public async criar(input: NovoPedido): Promise<PedidoCriado> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${input.compradorId}::uuid FOR NO KEY UPDATE`;
      const quantidadePorProduto = new Map<string, number>();
      for (const item of input.itens) {
        quantidadePorProduto.set(
          item.produtoId,
          (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade,
        );
      }

      const produtoIdsOrdenados = [...quantidadePorProduto.keys()].sort();
      const produtos = new Map<string, EstoqueRow>();

      for (const produtoId of produtoIdsOrdenados) {
        const rows = await tx.$queryRaw<EstoqueRow[]>`
          SELECT p."nome", p."preco"::text, p."quantidadeEstoque", p."ativo", p."desativadoPorAdmin",
            u."ativo" AS "artesaoAtivo", u."papel"::text AS "papelArtesao"
          FROM "Produto" p JOIN "Usuario" u ON u."id" = p."artesaoId"
          WHERE p."id" = ${produtoId}::uuid FOR UPDATE OF p
        `;
        const produto = rows[0];
        if (
          !produto ||
          !produto.ativo ||
          produto.desativadoPorAdmin ||
          !produto.artesaoAtivo ||
          produto.papelArtesao !== "artesao"
        ) {
          throw new AppError(
            404,
            "PRODUTO_NAO_ENCONTRADO",
            "Produto nao encontrado.",
          );
        }

        const quantidadeSolicitada = quantidadePorProduto.get(produtoId) ?? 0;
        if (produto.quantidadeEstoque < quantidadeSolicitada) {
          throw new AppError(
            409,
            "ESTOQUE_INSUFICIENTE",
            "Estoque insuficiente.",
            { produtoId, nome: produto.nome },
          );
        }
        produtos.set(produtoId, produto);
      }

      const itens = input.itens.map((item) => {
        const produto = produtos.get(item.produtoId);
        if (!produto) throw new Error("Produto validado ausente");
        const precoUnitario = new Prisma.Decimal(produto.preco);
        return {
          ...item,
          nome: produto.nome,
          precoUnitario,
          subtotal: precoUnitario.mul(item.quantidade),
        };
      });
      const total = itens.reduce(
        (soma, item) => soma.add(item.subtotal),
        new Prisma.Decimal(0),
      );
      if (total.greaterThan("99999999.99")) {
        throw new AppError(
          400,
          "VALIDACAO",
          "Total do pedido excede o limite permitido.",
        );
      }
      const pedidoId = randomUUID();
      const pedido = await tx.pedido.create({
        data: {
          id: pedidoId,
          compradorId: input.compradorId,
          status: "confirmado",
          total,
        },
      });
      for (const produtoId of produtoIdsOrdenados) {
        const quantidade = quantidadePorProduto.get(produtoId) ?? 0;
        await tx.produto.update({
          where: { id: produtoId },
          data: {
            quantidadeEstoque: { decrement: quantidade },
            quantidadeVendida: { increment: quantidade },
          },
        });
      }

      await tx.itemPedido.createMany({
        data: itens.map((item) => ({
          id: randomUUID(),
          pedidoId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.subtotal,
        })),
      });

      await tx.pagamento.create({
        data: {
          pedidoId,
          metodo: "pix_simulado",
          status: "aprovado",
          valor: total,
        },
      });
      await tx.itemCarrinho.deleteMany({
        where: { carrinhoId: input.compradorId },
      });
      await tx.carrinho.updateMany({
        where: { usuarioId: input.compradorId },
        data: { atualizadoEm: new Date() },
      });
      await tx.intencaoNotificacao.create({
        data: { id: randomUUID(), pedidoId },
      });

      if (!pedido.numero) throw new Error("Numero de pedido ausente");
      return {
        pedidoId,
        compradorId: pedido.compradorId,
        numero: pedido.numero,
        total: total.toNumber(),
        status: "confirmado",
        criadoEm: pedido.criadoEm.toISOString(),
        itens: itens.map((item) => ({
          ...item,
          precoUnitario: item.precoUnitario.toNumber(),
          subtotal: item.subtotal.toNumber(),
        })),
      };
    });
  }
}
