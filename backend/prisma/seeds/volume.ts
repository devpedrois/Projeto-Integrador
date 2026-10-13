import { seedUuid } from "./id.js";
import { DEMO } from "./demo.js";
import { REGIOES_SEED, TECNICAS_SEED } from "./referencias.js";

function databaseIdentity(value: string): string {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    throw new Error("DATABASE_URL invalida");
  }
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

export function validarVolumeEnvironment(
  environment: NodeJS.ProcessEnv,
): string {
  if (environment.ALLOW_VOLUME_SEED !== "1")
    throw new Error("Volume requer ALLOW_VOLUME_SEED=1");
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL obrigatoria");
  const identity = databaseIdentity(environment.DATABASE_URL);
  if (
    environment.DATABASE_URL_DEPLOY !== undefined &&
    identity === databaseIdentity(environment.DATABASE_URL_DEPLOY)
  ) {
    throw new Error("Volume proibido na base do deploy");
  }
  return environment.DATABASE_URL;
}

function elemento<T>(itens: readonly T[], indice: number): T {
  const item = itens[indice];
  if (item === undefined) throw new Error("Referencia sintetica inexistente");
  return item;
}

export function gerarVolume() {
  let estado = 20261013;
  const inteiro = (maximo: number): number => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado % maximo;
  };
  const criadoEm = new Date("2026-08-01T00:00:00.000Z");
  const artesaos = Array.from({ length: 50 }, (_, indice) => ({
    id: seedUuid(`volume-artesao-${indice}`),
    nome: `Artesao sintetico ${indice + 1}`,
    email: `artesao.${indice + 1}@volume.origem.test`,
    tecnicaPrincipalId: elemento(TECNICAS_SEED, indice % TECNICAS_SEED.length)
      .id,
    regiaoId: elemento(REGIOES_SEED, indice % REGIOES_SEED.length).id,
  }));
  const compradores = Array.from({ length: 300 }, (_, indice) => ({
    id: seedUuid(`volume-comprador-${indice}`),
    nome: `Comprador sintetico ${indice + 1}`,
    email: `comprador.${indice + 1}@volume.origem.test`,
  }));
  const produtos = Array.from({ length: 1000 }, (_, indice) => {
    const modelo = elemento(DEMO.produtos, indice % DEMO.produtos.length);
    return {
      id: seedUuid(`volume-produto-${indice}`),
      nome: `${modelo.nome} ${indice + 1}`,
      descricao: modelo.descricao,
      tecnicaId: modelo.tecnicaId,
      categoriaId: seedUuid(modelo.categoriaId),
      artesaoId: elemento(artesaos, inteiro(50)).id,
      precoCentavos: 2000 + inteiro(48001),
      quantidadeEstoque: 10 + inteiro(91),
      criadoEm,
    };
  });
  const pedidos = Array.from({ length: 1500 }, (_, indice) => {
    const produto = elemento(produtos, inteiro(1000));
    const quantidade = 1 + inteiro(3);
    return {
      id: seedUuid(`volume-pedido-${indice}`),
      numero: `VOL-${String(indice + 1).padStart(6, "0")}`,
      compradorId: elemento(compradores, inteiro(300)).id,
      produtoId: produto.id,
      quantidade,
      precoCentavos: produto.precoCentavos,
      totalCentavos: produto.precoCentavos * quantidade,
      criadoEm: new Date(criadoEm.getTime() + indice * 60000),
    };
  });
  return { artesaos, compradores, produtos, pedidos, criadoEm };
}
