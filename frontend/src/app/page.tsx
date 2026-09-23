"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { paraDestinoSeguro } from "@/utils/rota-segura";
import {
  obterCarrinhoStore,
  obterOpcoesFiltroService,
  obterProdutosService,
  obterRecomendacoesService,
  obterSessionStore,
} from "@/services/fake/container";
import { useSessao } from "@/hooks/use-sessao";
import { useCarrinho } from "@/hooks/use-carrinho";
import type { CartStore } from "@/store/carrinho.store";
import { useFiltrosUrl } from "@/hooks/use-filtros-url";
import { useOpcoesFiltro } from "@/hooks/use-opcoes-filtro";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import { ResultadoBusca } from "@/components/vitrine/ResultadoBusca";
import { FiltrosProdutos } from "@/components/vitrine/FiltrosProdutos";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
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

const CARRINHO_VAZIO = { itens: [], total: 0, atualizadoEm: "" };

const CARRINHO_STORE_INATIVO: CartStore = {
  getSnapshot: () => CARRINHO_VAZIO,
  subscribe: () => () => {},
} as unknown as CartStore;

export default function Home() {
  return (
    <Suspense fallback={null}>
      <PaginaInicial />
    </Suspense>
  );
}

function PaginaInicial() {
  const [produtosService, setProdutosService] = useState<ProdutosService | null>(null);
  const [recomendacoesService, setRecomendacoesService] =
    useState<RecomendacoesService | null>(null);
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);
  const [estado, setEstado] = useState<EstadoProdutos>({ status: "carregando" });
  const { query, atualizar, limpar } = useFiltrosUrl();
  const opcoesFiltro = useOpcoesFiltro(opcoesFiltroService);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setProdutosService(obterProdutosService());
    setRecomendacoesService(obterRecomendacoesService());
    setOpcoesFiltroService(obterOpcoesFiltroService());
    setSessionStore(obterSessionStore());
  }, []);

  const algumFiltroAtivo =
    query.termo !== undefined ||
    query.categoriaId !== undefined ||
    query.tecnicaId !== undefined ||
    query.regiaoId !== undefined;

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    if (!sessionStore) return;
    setCarrinhoStore(obterCarrinhoStore(sessao?.id));
  }, [sessionStore, sessao?.id]);

  const carrinho = useCarrinho(carrinhoStore ?? CARRINHO_STORE_INATIVO);

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

  function adicionarAoCarrinho(produto: Produto): void {
    if (!sessao) {
      router.push(`/login?redirect=${encodeURIComponent(paraDestinoSeguro(pathname))}`);
      return;
    }
    carrinhoStore?.adicionar(produto, 1);
  }

  const contextoRecomendacao: RecomendacaoContexto | null = sessao
    ? { usuarioId: sessao.id }
    : produtoDestacado
      ? { produtoId: produtoDestacado.id }
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Origem</h1>
        <Link href="/carrinho" className="text-sm underline">
          Carrinho ({carrinho.itens.length})
        </Link>
      </div>

      <FiltrosProdutos
        query={query}
        opcoes={opcoesFiltro}
        onAlterar={atualizar}
        onLimpar={limpar}
      />

      {algumFiltroAtivo ? (
        <ResultadoBusca service={produtosService} query={query} onLimpar={limpar} />
      ) : (
        <>
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
                <li key={produto.id} className="flex flex-col gap-2 rounded border border-gray-200 p-3">
                  <span className="block text-sm font-medium">{produto.nome}</span>
                  <span className="block text-sm text-neutral-600">
                    R$ {produto.preco.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => adicionarAoCarrinho(produto)}
                    className="self-start rounded border border-gray-300 p-2 text-sm"
                  >
                    Adicionar ao carrinho
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <FaixaRecomendacoes service={recomendacoesService} contexto={contextoRecomendacao} />
    </main>
  );
}
