"use client";

import { useEffect, useMemo, useState } from "react";
import {
  obterProdutosService,
  obterRecomendacoesService,
  obterSessionStore,
} from "@/services/fake/container";
import { useSessao } from "@/hooks/use-sessao";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { SessionStore } from "@/store/sessao.store";
import type { Produto } from "@/types/produto";
import type { RecomendacaoContexto } from "@/types/recomendacao";

type EstadoProdutos =
  | { status: "carregando" }
  | { status: "sucesso"; produtos: Produto[] }
  | { status: "vazio" }
  | { status: "erro" };

const STORE_INATIVO: SessionStore = {
  getSnapshot: () => null,
  subscribe: () => () => {},
} as unknown as SessionStore;

export default function Home() {
  const [produtosService, setProdutosService] = useState<ProdutosService | null>(null);
  const [recomendacoesService, setRecomendacoesService] =
    useState<RecomendacoesService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [estado, setEstado] = useState<EstadoProdutos>({ status: "carregando" });

  useEffect(() => {
    setProdutosService(obterProdutosService());
    setRecomendacoesService(obterRecomendacoesService());
    setSessionStore(obterSessionStore());
  }, []);

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    if (!produtosService) return;

    let cancelado = false;
    setEstado({ status: "carregando" });

    produtosService
      .list()
      .then((produtos) => {
        if (cancelado) return;
        setEstado(
          produtos.length === 0 ? { status: "vazio" } : { status: "sucesso", produtos }
        );
      })
      .catch(() => {
        if (cancelado) return;
        setEstado({ status: "erro" });
      });

    return () => {
      cancelado = true;
    };
  }, [produtosService]);

  const produtoDestacado = useMemo(() => {
    if (estado.status !== "sucesso") return null;
    return estado.produtos.find((produto) => produto.ativo && produto.quantidadeEstoque > 0) ?? null;
  }, [estado]);

  const contextoRecomendacao: RecomendacaoContexto | null = sessao
    ? { usuarioId: sessao.id }
    : produtoDestacado
      ? { produtoId: produtoDestacado.id }
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Origem</h1>

      {estado.status === "carregando" ? (
        <p role="status" className="text-sm text-neutral-600">
          Carregando produtos...
        </p>
      ) : null}

      {estado.status === "erro" ? (
        <p role="alert" className="text-sm text-red-700">
          Nao foi possivel carregar os produtos. Tente novamente em instantes.
        </p>
      ) : null}

      {estado.status === "vazio" ? (
        <p className="text-sm text-neutral-600">Nenhum produto disponivel no momento.</p>
      ) : null}

      {estado.status === "sucesso" ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {estado.produtos.map((produto) => (
            <li key={produto.id} className="rounded border border-gray-200 p-3">
              <span className="block text-sm font-medium">{produto.nome}</span>
              <span className="block text-sm text-neutral-600">
                R$ {produto.preco.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <FaixaRecomendacoes service={recomendacoesService} contexto={contextoRecomendacao} />
    </main>
  );
}
