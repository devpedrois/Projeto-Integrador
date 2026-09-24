import type { Produto } from "@/types/produto";
import { CATEGORIA_IDS } from "@/fake-api/seeds/categorias.seed";
import { REGIAO_IDS } from "@/fake-api/seeds/regioes.seed";
import { TECNICA_IDS } from "@/fake-api/seeds/tecnicas.seed";
import { AVALIACOES_SEED } from "@/fake-api/seeds/avaliacoes.seed";
import { calcularResumoAvaliacoes } from "@/domain/resumo-avaliacoes";

/**
 * Titularidade dos produtos-semente distribuida entre as duas contas de
 * artesao da carga de Usuario (fake-api/seeds/usuarios.seed.ts), para que
 * "Meus produtos" mostre massa real ao logar com qualquer uma delas.
 */
const ARTESAO_IDS = ["seed-artesao-01", "seed-artesao-02"] as const;

const REGIOES_CICLO = [
  REGIAO_IDS.pilarRecife,
  REGIAO_IDS.altoMouraCaruaru,
  REGIAO_IDS.tracunhaem,
] as const;

interface ModeloProduto {
  nome: string;
  descricao: string;
  tecnicaId: string;
}

const MODELOS_POR_CATEGORIA: Record<string, ModeloProduto[]> = {
  [CATEGORIA_IDS.ceramicaBarro]: [
    {
      nome: "Vaso de Barro Trancado",
      descricao: "Vaso modelado a mao com argila da regiao, acabamento fosco natural.",
      tecnicaId: TECNICA_IDS.modelagemArgila,
    },
    {
      nome: "Panela de Barro Vidrada",
      descricao: "Panela tradicional vidrada, ideal para receitas de fogo lento.",
      tecnicaId: TECNICA_IDS.tornoCeramico,
    },
    {
      nome: "Boneca de Barro Pintada",
      descricao: "Boneca artesanal inspirada no artesanato figurativo de Caruaru.",
      tecnicaId: TECNICA_IDS.modelagemArgila,
    },
    {
      nome: "Jarra Ceramica Esculpida",
      descricao: "Jarra utilitaria com relevos entalhados a mao no torno.",
      tecnicaId: TECNICA_IDS.tornoCeramico,
    },
    {
      nome: "Prato Decorativo em Barro",
      descricao: "Prato decorativo com pintura mineral aplicada apos a queima.",
      tecnicaId: TECNICA_IDS.modelagemArgila,
    },
    {
      nome: "Conjunto de Xicaras de Barro",
      descricao: "Conjunto de quatro xicaras torneadas e queimadas em forno a lenha.",
      tecnicaId: TECNICA_IDS.tornoCeramico,
    },
  ],
  [CATEGORIA_IDS.rendaBordado]: [
    {
      nome: "Toalha de Renda Irlandesa",
      descricao: "Toalha de mesa bordada em renda irlandesa, motivo floral.",
      tecnicaId: TECNICA_IDS.rendaIrlandesa,
    },
    {
      nome: "Blusa Bordada a Mao",
      descricao: "Blusa em algodao com bordado floral feito ponto a ponto.",
      tecnicaId: TECNICA_IDS.bordadoMao,
    },
    {
      nome: "Guardanapo de Renda Filet",
      descricao: "Jogo de guardanapos em renda filet, acabamento delicado.",
      tecnicaId: TECNICA_IDS.rendaIrlandesa,
    },
    {
      nome: "Vestido Infantil Bordado",
      descricao: "Vestido infantil com bordado em ponto cheio nas mangas.",
      tecnicaId: TECNICA_IDS.bordadoMao,
    },
    {
      nome: "Toalha de Banho Bordada",
      descricao: "Toalha de banho com barrado bordado a mao em fio natural.",
      tecnicaId: TECNICA_IDS.bordadoMao,
    },
    {
      nome: "Colcha em Renda Artesanal",
      descricao: "Colcha de solteiro trancada em renda de bilros tradicional.",
      tecnicaId: TECNICA_IDS.rendaIrlandesa,
    },
  ],
  [CATEGORIA_IDS.madeiraEntalhada]: [
    {
      nome: "Caixa Entalhada em Madeira",
      descricao: "Caixa decorativa entalhada a mao com motivos regionais.",
      tecnicaId: TECNICA_IDS.entalheMadeira,
    },
    {
      nome: "Colher de Pau Esculpida",
      descricao: "Colher utilitaria esculpida em madeira de reflorestamento.",
      tecnicaId: TECNICA_IDS.entalheMadeira,
    },
    {
      nome: "Porta-Retrato em Madeira",
      descricao: "Porta-retrato entalhado com moldura floral artesanal.",
      tecnicaId: TECNICA_IDS.entalheMadeira,
    },
    {
      nome: "Banco Rustico de Marcenaria",
      descricao: "Banco baixo produzido em marcenaria artesanal solida.",
      tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    },
    {
      nome: "Escultura de Ave em Madeira",
      descricao: "Escultura entalhada representando a fauna nordestina.",
      tecnicaId: TECNICA_IDS.entalheMadeira,
    },
    {
      nome: "Jogo de Talheres em Madeira",
      descricao: "Jogo de talheres de servir esculpidos em madeira nativa.",
      tecnicaId: TECNICA_IDS.marcenariaArtesanal,
    },
  ],
  [CATEGORIA_IDS.textilCostura]: [
    {
      nome: "Bolsa em Tecido Autoral",
      descricao: "Bolsa costurada em tecido estampado de producao autoral.",
      tecnicaId: TECNICA_IDS.costuraAutoral,
    },
    {
      nome: "Manta em Tear Manual",
      descricao: "Manta tecida a mao em tear manual com fios naturais.",
      tecnicaId: TECNICA_IDS.tecelagemManual,
    },
    {
      nome: "Camisa de Algodao Costurada",
      descricao: "Camisa de corte reto costurada em algodao organico.",
      tecnicaId: TECNICA_IDS.costuraAutoral,
    },
    {
      nome: "Almofada em Patchwork",
      descricao: "Almofada em patchwork costurado com retalhos regionais.",
      tecnicaId: TECNICA_IDS.costuraAutoral,
    },
    {
      nome: "Tapete Tecido a Mao",
      descricao: "Tapete de fibra tecido a mao em tear artesanal.",
      tecnicaId: TECNICA_IDS.tecelagemManual,
    },
    {
      nome: "Ecobag em Tecido Cru",
      descricao: "Ecobag costurada em tecido cru com estampa autoral.",
      tecnicaId: TECNICA_IDS.costuraAutoral,
    },
  ],
  [CATEGORIA_IDS.bijuteriaAcessorios]: [
    {
      nome: "Colar em Sementes Naturais",
      descricao: "Colar artesanal com sementes regionais selecionadas.",
      tecnicaId: TECNICA_IDS.bijuteriaSementes,
    },
    {
      nome: "Brinco Trancado em Fibra",
      descricao: "Brinco leve trancado em fibra natural de carnauba.",
      tecnicaId: TECNICA_IDS.trancadoFibra,
    },
    {
      nome: "Pulseira em Micangas",
      descricao: "Pulseira artesanal com micangas coloridas trancadas.",
      tecnicaId: TECNICA_IDS.bijuteriaSementes,
    },
    {
      nome: "Anel em Fibra Trancada",
      descricao: "Anel confeccionado em fibra natural trancada a mao.",
      tecnicaId: TECNICA_IDS.trancadoFibra,
    },
    {
      nome: "Bolsa de Palha Trancada",
      descricao: "Pequena bolsa em palha trancada com fechamento em madeira.",
      tecnicaId: TECNICA_IDS.trancadoFibra,
    },
    {
      nome: "Chapeu de Palha Artesanal",
      descricao: "Chapeu confeccionado em palha trancada da regiao.",
      tecnicaId: TECNICA_IDS.trancadoFibra,
    },
  ],
};

const FOTO_POR_CATEGORIA: Record<string, string> = {
  [CATEGORIA_IDS.ceramicaBarro]: "/produtos/ceramica-barro.svg",
  [CATEGORIA_IDS.rendaBordado]: "/produtos/renda-bordado.svg",
  [CATEGORIA_IDS.madeiraEntalhada]: "/produtos/madeira-entalhada.svg",
  [CATEGORIA_IDS.textilCostura]: "/produtos/textil-costura.svg",
  [CATEGORIA_IDS.bijuteriaAcessorios]: "/produtos/bijuteria-acessorios.svg",
};

const BASE_CRIADO_EM_MS = Date.UTC(2026, 7, 1);
const UM_DIA_MS = 24 * 60 * 60 * 1000;

function notaMediaSemeada(produtoId: string): number {
  const avaliacoes = AVALIACOES_SEED.filter((avaliacao) => avaliacao.produtoId === produtoId);
  return calcularResumoAvaliacoes(produtoId, avaliacoes).media;
}

function gerarProdutosSeed(): Produto[] {
  const produtos: Produto[] = [];
  let indiceGlobal = 0;

  for (const categoriaId of Object.values(CATEGORIA_IDS)) {
    const modelos = MODELOS_POR_CATEGORIA[categoriaId];
    if (!modelos) continue;

    modelos.forEach((modelo, indiceNaCategoria) => {
      const id = `produto-seed-${String(indiceGlobal + 1).padStart(2, "0")}`;
      const regiaoId = REGIOES_CICLO[indiceGlobal % REGIOES_CICLO.length] as string;
      const artesaoId = ARTESAO_IDS[indiceGlobal % ARTESAO_IDS.length] as string;

      produtos.push({
        id,
        nome: modelo.nome,
        descricao: modelo.descricao,
        preco: 39.9 + indiceNaCategoria * 15 + (indiceGlobal % 3) * 4.5,
        categoriaId,
        tecnicaId: modelo.tecnicaId,
        regiaoId,
        artesaoId,
        fotos: [{ url: FOTO_POR_CATEGORIA[categoriaId] as string, ordem: 0 }],
        quantidadeEstoque: 3 + ((indiceGlobal * 5) % 40),
        quantidadeVendida: (indiceGlobal * 13) % 97,
        notaMedia: notaMediaSemeada(id),
        ativo: true,
        criadoEm: new Date(BASE_CRIADO_EM_MS + indiceGlobal * UM_DIA_MS).toISOString(),
      });

      indiceGlobal += 1;
    });
  }

  return produtos;
}

export const PRODUTOS_SEED: readonly Produto[] = gerarProdutosSeed();
