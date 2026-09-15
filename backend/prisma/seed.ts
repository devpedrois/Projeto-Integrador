import "dotenv/config";
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { parseEnvironment } from "../src/config/environment.js";
import { createPrismaClient } from "../src/database/prisma/client.js";

function syntheticPasswordHash(label: string): string {
  return `seed$demo$${label}`;
}

export const seedIds = {
  usuarios: {
    admin: "a0000000-0000-4000-8000-000000000001",
    artesao1: "a0000000-0000-4000-8000-000000000002",
    artesao2: "a0000000-0000-4000-8000-000000000003",
    comprador1: "a0000000-0000-4000-8000-000000000004",
    comprador2: "a0000000-0000-4000-8000-000000000005",
  },
  categorias: {
    ceramica: "c0000000-0000-4000-8000-000000000001",
    renda: "c0000000-0000-4000-8000-000000000002",
    madeira: "c0000000-0000-4000-8000-000000000003",
    textil: "c0000000-0000-4000-8000-000000000004",
    bijuteria: "c0000000-0000-4000-8000-000000000005",
    reciclada: "c0000000-0000-4000-8000-000000000006",
  },
  produtos: {
    vasoBarro: "b0000000-0000-4000-8000-000000000001",
    jarraFosca: "b0000000-0000-4000-8000-000000000002",
    toalhaRenda: "b0000000-0000-4000-8000-000000000003",
    colchaBordada: "b0000000-0000-4000-8000-000000000004",
    fruteiraEntalhada: "b0000000-0000-4000-8000-000000000005",
    camisaAutoral: "b0000000-0000-4000-8000-000000000006",
    brincoSemente: "b0000000-0000-4000-8000-000000000007",
    luminariaPet: "b0000000-0000-4000-8000-000000000008",
    cestoFibra: "b0000000-0000-4000-8000-000000000009",
  },
  pedidos: {
    primeiro: "d0000000-0000-4000-8000-000000000001",
    segundo: "d0000000-0000-4000-8000-000000000002",
    terceiro: "d0000000-0000-4000-8000-000000000003",
  },
} as const;

export async function runSeed(prisma: PrismaClient): Promise<void> {
  const { usuarios, categorias, produtos, pedidos } = seedIds;
  const tx = prisma;

  {
    await tx.usuario.upsert({
      where: { id: usuarios.admin },
      update: {},
      create: {
        id: usuarios.admin,
        nome: "Admin Origem",
        email: "admin.demo@origem.test",
        senhaHash: syntheticPasswordHash("admin"),
        papel: "admin",
      },
    });
    await tx.usuario.upsert({
      where: { id: usuarios.artesao1 },
      update: {},
      create: {
        id: usuarios.artesao1,
        nome: "Maria do Pilar",
        email: "maria.artesa.demo@origem.test",
        senhaHash: syntheticPasswordHash("artesao1"),
        papel: "artesao",
      },
    });
    await tx.usuario.upsert({
      where: { id: usuarios.artesao2 },
      update: {},
      create: {
        id: usuarios.artesao2,
        nome: "Joao do Alto da Moura",
        email: "joao.artesao.demo@origem.test",
        senhaHash: syntheticPasswordHash("artesao2"),
        papel: "artesao",
      },
    });
    await tx.usuario.upsert({
      where: { id: usuarios.comprador1 },
      update: {},
      create: {
        id: usuarios.comprador1,
        nome: "Ana Compradora",
        email: "ana.compradora.demo@origem.test",
        senhaHash: syntheticPasswordHash("comprador1"),
        papel: "comprador",
      },
    });
    await tx.usuario.upsert({
      where: { id: usuarios.comprador2 },
      update: {},
      create: {
        id: usuarios.comprador2,
        nome: "Carlos Comprador",
        email: "carlos.comprador.demo@origem.test",
        senhaHash: syntheticPasswordHash("comprador2"),
        papel: "comprador",
      },
    });

    await tx.perfilArtesao.upsert({
      where: { usuarioId: usuarios.artesao1 },
      update: {},
      create: {
        usuarioId: usuarios.artesao1,
        historia: "Ceramista da Comunidade do Pilar, Recife, ha tres geracoes.",
        tecnicaPrincipal: "Ceramica em barro",
        regiao: "Recife - Comunidade do Pilar",
        completo: true,
      },
    });
    await tx.perfilArtesao.upsert({
      where: { usuarioId: usuarios.artesao2 },
      update: {},
      create: {
        usuarioId: usuarios.artesao2,
        historia: "Marceneiro e bordador do Alto do Moura, Caruaru.",
        tecnicaPrincipal: "Marcenaria e renda",
        regiao: "Caruaru - Alto do Moura",
        completo: true,
      },
    });

    await tx.carrinho.upsert({
      where: { usuarioId: usuarios.comprador1 },
      update: {},
      create: { usuarioId: usuarios.comprador1 },
    });

    for (const [nome, id] of Object.entries(categorias)) {
      await tx.categoria.upsert({
        where: { id },
        update: {},
        create: { id, nome: categoriaNome(nome) },
      });
    }

    await tx.produto.upsert({
      where: { id: produtos.vasoBarro },
      update: {},
      create: {
        id: produtos.vasoBarro,
        nome: "Vaso de Barro Trancoso",
        descricao: "Vaso torneado a mao com barro da regiao do Pilar.",
        preco: "89.90",
        quantidadeEstoque: 12,
        ativo: true,
        artesaoId: usuarios.artesao1,
        categoriaId: categorias.ceramica,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.jarraFosca },
      update: {},
      create: {
        id: produtos.jarraFosca,
        nome: "Jarra de Barro Fosca",
        descricao: "Jarra de acabamento fosco, sem vendas ate o momento.",
        preco: "64.50",
        quantidadeEstoque: 5,
        ativo: true,
        artesaoId: usuarios.artesao1,
        categoriaId: categorias.ceramica,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.toalhaRenda },
      update: {},
      create: {
        id: produtos.toalhaRenda,
        nome: "Toalha de Renda File",
        descricao: "Toalha de mesa em renda file artesanal.",
        preco: "149.90",
        quantidadeEstoque: 8,
        ativo: true,
        artesaoId: usuarios.artesao2,
        categoriaId: categorias.renda,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.colchaBordada },
      update: {},
      create: {
        id: produtos.colchaBordada,
        nome: "Colcha Bordada Ponto Cruz",
        descricao: "Colcha bordada a mao, atualmente sem estoque.",
        preco: "199.90",
        quantidadeEstoque: 0,
        ativo: true,
        artesaoId: usuarios.artesao1,
        categoriaId: categorias.renda,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.fruteiraEntalhada },
      update: {},
      create: {
        id: produtos.fruteiraEntalhada,
        nome: "Fruteira Entalhada",
        descricao: "Fruteira em madeira de reflorestamento, entalhe manual.",
        preco: "219.90",
        quantidadeEstoque: 6,
        ativo: true,
        artesaoId: usuarios.artesao2,
        categoriaId: categorias.madeira,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.camisaAutoral },
      update: {},
      create: {
        id: produtos.camisaAutoral,
        nome: "Camisa Autoral Origem",
        descricao: "Camisa de algodao com estampa autoral pernambucana.",
        preco: "129.90",
        quantidadeEstoque: 10,
        ativo: true,
        artesaoId: usuarios.artesao1,
        categoriaId: categorias.textil,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.brincoSemente },
      update: {},
      create: {
        id: produtos.brincoSemente,
        nome: "Brinco de Semente Regional",
        descricao: "Brinco artesanal com sementes nativas de Pernambuco.",
        preco: "39.90",
        quantidadeEstoque: 15,
        ativo: true,
        artesaoId: usuarios.artesao2,
        categoriaId: categorias.bijuteria,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.luminariaPet },
      update: {},
      create: {
        id: produtos.luminariaPet,
        nome: "Luminaria PET Reciclada",
        descricao: "Luminaria feita com garrafas PET recicladas, sem vendas ate o momento.",
        preco: "74.90",
        quantidadeEstoque: 7,
        ativo: true,
        artesaoId: usuarios.artesao1,
        categoriaId: categorias.reciclada,
      },
    });
    await tx.produto.upsert({
      where: { id: produtos.cestoFibra },
      update: {},
      create: {
        id: produtos.cestoFibra,
        nome: "Cesto de Fibra Descontinuado",
        descricao: "Cesto de fibra natural, produto inativo nesta carga.",
        preco: "54.90",
        quantidadeEstoque: 3,
        ativo: false,
        artesaoId: usuarios.artesao2,
        categoriaId: categorias.reciclada,
      },
    });

    const fotos: Array<{ id: string; produtoId: string; ordem: number }> = [
      { id: "e0000000-0000-4000-8000-000000000001", produtoId: produtos.vasoBarro, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000002", produtoId: produtos.vasoBarro, ordem: 1 },
      { id: "e0000000-0000-4000-8000-000000000003", produtoId: produtos.jarraFosca, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000004", produtoId: produtos.toalhaRenda, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000005", produtoId: produtos.colchaBordada, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000006", produtoId: produtos.fruteiraEntalhada, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000007", produtoId: produtos.camisaAutoral, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000008", produtoId: produtos.brincoSemente, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000009", produtoId: produtos.luminariaPet, ordem: 0 },
      { id: "e0000000-0000-4000-8000-000000000010", produtoId: produtos.cestoFibra, ordem: 0 },
    ];
    for (const foto of fotos) {
      await tx.produtoFoto.upsert({
        where: { id: foto.id },
        update: {},
        create: {
          id: foto.id,
          produtoId: foto.produtoId,
          url: `https://cdn.origem.test/seed/${foto.id}.jpg`,
          ordem: foto.ordem,
        },
      });
    }

    await tx.pedido.upsert({
      where: { id: pedidos.primeiro },
      update: {},
      create: {
        id: pedidos.primeiro,
        compradorRef: `seed:${usuarios.comprador1}`,
        compradorId: usuarios.comprador1,
        numero: "PED-0001",
        status: "confirmado",
        total: "419.60",
      },
    });
    await tx.pedido.upsert({
      where: { id: pedidos.segundo },
      update: {},
      create: {
        id: pedidos.segundo,
        compradorRef: `seed:${usuarios.comprador2}`,
        compradorId: usuarios.comprador2,
        numero: "PED-0002",
        status: "confirmado",
        total: "339.40",
      },
    });
    await tx.pedido.upsert({
      where: { id: pedidos.terceiro },
      update: {},
      create: {
        id: pedidos.terceiro,
        compradorRef: `seed:${usuarios.comprador1}`,
        compradorId: usuarios.comprador1,
        numero: "PED-0003",
        status: "cancelado",
        total: "479.70",
      },
    });

    const itens = [
      {
        id: "f0000000-0000-4000-8000-000000000001",
        pedidoId: pedidos.primeiro,
        produtoId: produtos.vasoBarro,
        quantidade: 3,
        precoUnitario: "89.90",
        subtotal: "269.70",
      },
      {
        id: "f0000000-0000-4000-8000-000000000002",
        pedidoId: pedidos.primeiro,
        produtoId: produtos.toalhaRenda,
        quantidade: 1,
        precoUnitario: "149.90",
        subtotal: "149.90",
      },
      {
        id: "f0000000-0000-4000-8000-000000000003",
        pedidoId: pedidos.segundo,
        produtoId: produtos.vasoBarro,
        quantidade: 2,
        precoUnitario: "89.90",
        subtotal: "179.80",
      },
      {
        id: "f0000000-0000-4000-8000-000000000004",
        pedidoId: pedidos.segundo,
        produtoId: produtos.brincoSemente,
        quantidade: 4,
        precoUnitario: "39.90",
        subtotal: "159.60",
      },
      {
        id: "f0000000-0000-4000-8000-000000000005",
        pedidoId: pedidos.terceiro,
        produtoId: produtos.fruteiraEntalhada,
        quantidade: 1,
        precoUnitario: "219.90",
        subtotal: "219.90",
      },
      {
        id: "f0000000-0000-4000-8000-000000000006",
        pedidoId: pedidos.terceiro,
        produtoId: produtos.camisaAutoral,
        quantidade: 2,
        precoUnitario: "129.90",
        subtotal: "259.80",
      },
    ];
    for (const item of itens) {
      await tx.itemPedido.upsert({
        where: { id: item.id },
        update: {},
        create: item,
      });
    }

    await tx.pagamento.upsert({
      where: { id: "fa000000-0000-4000-8000-000000000001" },
      update: {},
      create: {
        id: "fa000000-0000-4000-8000-000000000001",
        pedidoId: pedidos.primeiro,
        valor: "419.60",
        status: "aprovado",
      },
    });
    await tx.pagamento.upsert({
      where: { id: "fa000000-0000-4000-8000-000000000002" },
      update: {},
      create: {
        id: "fa000000-0000-4000-8000-000000000002",
        pedidoId: pedidos.segundo,
        valor: "339.40",
        status: "aprovado",
      },
    });
    await tx.pagamento.upsert({
      where: { id: "fa000000-0000-4000-8000-000000000003" },
      update: {},
      create: {
        id: "fa000000-0000-4000-8000-000000000003",
        pedidoId: pedidos.terceiro,
        valor: "479.70",
        status: "recusado",
      },
    });

    const avaliacoes = [
      {
        id: "fb000000-0000-4000-8000-000000000001",
        compradorId: usuarios.comprador1,
        produtoId: produtos.vasoBarro,
        nota: 5,
        comentario: "Peca linda, chegou bem embalada.",
      },
      {
        id: "fb000000-0000-4000-8000-000000000002",
        compradorId: usuarios.comprador2,
        produtoId: produtos.vasoBarro,
        nota: 3,
        comentario: "Bonito, mas demorou para chegar.",
      },
      {
        id: "fb000000-0000-4000-8000-000000000003",
        compradorId: usuarios.comprador2,
        produtoId: produtos.brincoSemente,
        nota: 4,
        comentario: null,
      },
      {
        id: "fb000000-0000-4000-8000-000000000004",
        compradorId: usuarios.comprador1,
        produtoId: produtos.fruteiraEntalhada,
        nota: 5,
        comentario: "Acabamento impecavel.",
      },
    ];
    for (const avaliacao of avaliacoes) {
      await tx.avaliacao.upsert({
        where: { id: avaliacao.id },
        update: {},
        create: avaliacao,
      });
    }

    await tx.itemCarrinho.upsert({
      where: { id: "fc000000-0000-4000-8000-000000000001" },
      update: {},
      create: {
        id: "fc000000-0000-4000-8000-000000000001",
        carrinhoId: usuarios.comprador1,
        produtoId: produtos.toalhaRenda,
        quantidade: 1,
        precoUnitario: "149.90",
      },
    });
  }
}

function categoriaNome(chave: string): string {
  const nomes: Record<string, string> = {
    ceramica: "Ceramica e Barro",
    renda: "Renda e Bordado",
    madeira: "Madeira Entalhada e Marcenaria Artesanal",
    textil: "Textil e Costura Autoral",
    bijuteria: "Bijuteria e Acessorios Artesanais",
    reciclada: "Arte Reciclada e Sustentavel",
  };
  const nome = nomes[chave];
  if (nome === undefined) {
    throw new Error(`Categoria sintetica desconhecida: ${chave}`);
  }
  return nome;
}

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const prisma = createPrismaClient(environment.DATABASE_URL);
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const executedFile = process.argv[1];
if (
  executedFile !== undefined &&
  import.meta.url === pathToFileURL(executedFile).href
) {
  main().catch(() => {
    process.stderr.write("Database seed failed\n");
    process.exitCode = 1;
  });
}
