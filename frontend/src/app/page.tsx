"use client";

import { Suspense, useEffect, useState } from "react";
import {
  obterCarrinhoStore,
  obterOpcoesFiltroService,
  obterProdutosService,
  obterRecomendacoesService,
  obterSessionStore,
  obterUsuariosService,
} from "@/services/fake/container";
import { ServiceError } from "@/services/errors";
import { useSessao } from "@/hooks/use-sessao";
import type { CartStore } from "@/store/carrinho.store";
import { useFiltrosUrl } from "@/hooks/use-filtros-url";
import { useOpcoesFiltro } from "@/hooks/use-opcoes-filtro";
import { useArtesaosAtivos } from "@/hooks/use-artesaos-ativos";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import { ResultadoBusca } from "@/components/vitrine/ResultadoBusca";
import { FiltrosProdutos } from "@/components/vitrine/FiltrosProdutos";
import { ProdutoCard } from "@/components/vitrine/ProdutoCard";
import { HeroVaso } from "@/components/vitrine/HeroVaso";
import { Icone } from "@/components/vitrine/Icone";
import {
  CLASSE_ALERTA,
  CLASSE_STATUS,
  CLASSE_VAZIO,
  EsqueletoProdutos,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
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
  return (
    <Suspense fallback={null}>
      <PaginaInicial />
    </Suspense>
  );
}

function PaginaInicial() {
  const [produtosService, setProdutosService] =
    useState<ProdutosService | null>(null);
  const [recomendacoesService, setRecomendacoesService] =
    useState<RecomendacoesService | null>(null);
  const [opcoesFiltroService, setOpcoesFiltroService] =
    useState<OpcoesFiltroService | null>(null);
  const [usuariosService, setUsuariosService] =
    useState<UsuariosService | null>(null);
  const [sessionStore, setSessionStore] = useState<SessionStore | null>(null);
  const [carrinhoStore, setCarrinhoStore] = useState<CartStore | null>(null);
  const [estado, setEstado] = useState<EstadoProdutos>({
    status: "carregando",
  });
  const [errosCarrinho, setErrosCarrinho] = useState<Record<string, string>>(
    {},
  );
  const { query, atualizar, limpar } = useFiltrosUrl();
  const opcoesFiltro = useOpcoesFiltro(opcoesFiltroService);
  const artesaosAtivos = useArtesaosAtivos(usuariosService);

  useEffect(() => {
    setProdutosService(obterProdutosService());
    setRecomendacoesService(obterRecomendacoesService());
    setOpcoesFiltroService(obterOpcoesFiltroService());
    setUsuariosService(obterUsuariosService());
    setSessionStore(obterSessionStore());
  }, []);

  const algumFiltroAtivo =
    query.termo !== undefined ||
    query.categoriaId !== undefined ||
    query.tecnicaId !== undefined ||
    query.regiaoId !== undefined ||
    query.artesaoId !== undefined;

  const sessao = useSessao(sessionStore ?? STORE_INATIVO);

  useEffect(() => {
    if (!sessionStore) return;
    setCarrinhoStore(obterCarrinhoStore(sessao?.id));
  }, [sessionStore, sessao?.id]);

  useEffect(() => {
    if (!produtosService) return;

    let cancelado = false;
    setEstado({ status: "carregando" });

    produtosService
      .list()
      .then((produtos) => {
        if (cancelado) return;
        setEstado(
          produtos.length === 0
            ? { status: "vazio" }
            : { status: "sucesso", produtos },
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

  async function adicionarAoCarrinho(produto: Produto): Promise<void> {
    try {
      if (sessao && sessao.papel !== "comprador")
        throw new ServiceError(
          "ACESSO_NEGADO",
          "Somente compradores podem adicionar ao carrinho.",
        );
      if (!carrinhoStore) return;
      await carrinhoStore.adicionar(produto, 1);
      setErrosCarrinho((atual) => {
        if (!(produto.id in atual)) return atual;
        const resto = { ...atual };
        delete resto[produto.id];
        return resto;
      });
    } catch (excecao) {
      if (excecao instanceof ServiceError) {
        setErrosCarrinho((atual) => ({
          ...atual,
          [produto.id]: excecao.message,
        }));
      } else {
        setErrosCarrinho((atual) => ({
          ...atual,
          [produto.id]: "Não foi possível adicionar ao carrinho.",
        }));
      }
    }
  }

  const contextoRecomendacao: RecomendacaoContexto =
    sessao?.papel === "comprador" ? { usuarioId: sessao.id } : {};

  return (
    <main className="min-h-screen">
      <HeroVaso />

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] pb-20">
        <div className="grid gap-5 border-t border-border-default pt-7 lg:grid-cols-[264px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <FiltrosProdutos
            query={query}
            opcoes={opcoesFiltro}
            artesaos={artesaosAtivos}
            onAlterar={atualizar}
            onLimpar={limpar}
          />

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-2 lg:row-start-2">
            {algumFiltroAtivo ? (
              <ResultadoBusca
                service={produtosService}
                usuariosService={usuariosService}
                query={query}
                onLimpar={limpar}
                onAdicionarAoCarrinho={adicionarAoCarrinho}
                errosCarrinho={errosCarrinho}
              />
            ) : (
              <>
                {estado.status === "carregando" ? (
                  <>
                    <p role="status" className={CLASSE_STATUS}>
                      Carregando produtos...
                    </p>
                    <EsqueletoProdutos />
                  </>
                ) : null}

                {estado.status === "erro" ? (
                  <p role="alert" className={CLASSE_ALERTA}>
                    <Icone nome="alerta" className="mt-0.5 flex-none" />
                    Não foi possível carregar os produtos. Tente novamente em
                    instantes.
                  </p>
                ) : null}

                {estado.status === "vazio" ? (
                  <div className={CLASSE_VAZIO}>
                    <IconeVazio nome="pacote" />
                    <p className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
                      Nenhum produto disponível no momento.
                    </p>
                  </div>
                ) : null}

                {estado.status === "sucesso" ? (
                  <ul className="grid grid-cols-2 gap-[var(--grid-gap)] md:grid-cols-3">
                    {estado.produtos.map((produto) => (
                      <ProdutoCard
                        key={produto.id}
                        produto={produto}
                        usuariosService={usuariosService}
                        onAdicionarAoCarrinho={adicionarAoCarrinho}
                        erroCarrinho={errosCarrinho[produto.id]}
                      />
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </div>

        <FaixaRecomendacoes
          service={recomendacoesService}
          contexto={contextoRecomendacao}
        />
      </div>
    </main>
  );
}
