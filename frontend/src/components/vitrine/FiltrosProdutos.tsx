"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/vitrine/Icone";
import type { EstadoOpcoesFiltro } from "@/hooks/use-opcoes-filtro";
import type { EstadoArtesaosAtivos } from "@/hooks/use-artesaos-ativos";
import type { ProdutoQuery } from "@/types/produto-query";

export interface FiltrosProdutosProps {
  query: ProdutoQuery;
  opcoes: EstadoOpcoesFiltro;
  artesaos?: EstadoArtesaosAtivos;
  onAlterar(alteracoes: Partial<ProdutoQuery>): void;
  onLimpar(): void;
}

const CAMPO = "flex min-w-0 flex-col gap-1.5";

const ROTULO = "text-sm leading-tight font-semibold text-fg-strong";

const CONTROLE =
  "h-[var(--control-h-md)] w-full rounded-control border border-border-input bg-surface-card text-base text-fg-strong shadow-[var(--inset-shadow-xs)] outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out hover:border-linho-400 focus:border-border-focus focus:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70";

const SELECT = `${CONTROLE} cursor-pointer appearance-none pr-[42px] pl-3.5`;

const BOTAO_SECUNDARIO =
  "inline-flex h-[var(--control-h-md)] items-center justify-center gap-2 rounded-control border border-border-strong bg-surface-card px-5 text-button font-semibold whitespace-nowrap text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover active:translate-y-px";

function valorOuVazio(valor: string | undefined): string {
  return valor ?? "";
}

function valorOuIndefinido(valor: string): string | undefined {
  return valor === "" ? undefined : valor;
}

function SetaSelect() {
  return (
    <Icone
      nome="seta"
      className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-fg-muted"
    />
  );
}

export function FiltrosProdutos({
  query,
  opcoes,
  artesaos = { status: "carregando" },
  onAlterar,
  onLimpar,
}: FiltrosProdutosProps) {
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const opcoesCarregadas = opcoes.status === "sucesso" ? opcoes : null;
  const artesaosCarregados = artesaos.status === "sucesso" ? artesaos : null;
  const algumFiltroAtivo =
    query.termo !== undefined ||
    query.categoriaId !== undefined ||
    query.tecnicaId !== undefined ||
    query.regiaoId !== undefined ||
    query.artesaoId !== undefined;
  const filtrosDaGaveta = [query.categoriaId, query.tecnicaId, query.regiaoId, query.artesaoId].filter(
    (valor) => valor !== undefined
  ).length;

  useEffect(() => {
    if (gavetaAberta) fecharRef.current?.focus();
  }, [gavetaAberta]);

  return (
    <div className="contents">
      <div className="flex items-end gap-2.5 lg:col-start-2 lg:row-start-1">
        <div className={`${CAMPO} flex-1`}>
          <label htmlFor="busca-produtos" className={ROTULO}>
            Buscar produtos
          </label>
          <div className="relative flex items-center">
            <Icone
              nome="busca"
              className="pointer-events-none absolute left-3.5 text-fg-muted"
            />
            <input
              id="busca-produtos"
              type="search"
              value={valorOuVazio(query.termo)}
              onChange={(evento) => onAlterar({ termo: valorOuIndefinido(evento.target.value) })}
              className={`${CONTROLE} pr-3.5 pl-[42px] placeholder:text-fg-subtle`}
              placeholder="Nome ou descricao do produto"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGavetaAberta(true)}
          aria-expanded={gavetaAberta}
          aria-controls="gaveta-filtros"
          className={`${BOTAO_SECUNDARIO} flex-none px-3.5 lg:hidden`}
        >
          <Icone nome="ajustes" />
          Filtros
          {filtrosDaGaveta > 0 ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-barro-500 px-1.5 text-[11px] font-bold text-fg-on-brand">
              {filtrosDaGaveta}
            </span>
          ) : null}
        </button>
      </div>

      {gavetaAberta ? (
        <div
          aria-hidden="true"
          onClick={() => setGavetaAberta(false)}
          className="fixed inset-0 z-40 bg-overlay-scrim lg:hidden"
        />
      ) : null}

      <aside
        id="gaveta-filtros"
        aria-label="Filtros"
        role={gavetaAberta ? "dialog" : undefined}
        aria-modal={gavetaAberta ? true : undefined}
        onKeyDown={(evento) => {
          if (evento.key === "Escape") setGavetaAberta(false);
        }}
        className={`${
          gavetaAberta
            ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] overflow-auto rounded-t-lg bg-surface-raised px-4 pt-2 pb-5 shadow-lg"
            : "hidden"
        } flex-col gap-5 lg:sticky lg:top-24 lg:bottom-auto lg:z-auto lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:max-h-none lg:self-start lg:overflow-visible lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none`}
      >
        <div className="flex h-13 items-center justify-between border-b border-border-subtle lg:hidden">
          <span className="font-display text-[22px] font-semibold text-fg-strong">Filtros</span>
          <button
            ref={fecharRef}
            type="button"
            aria-label="Fechar filtros"
            onClick={() => setGavetaAberta(false)}
            className="grid size-11 place-items-center rounded-md text-fg-strong hover:bg-action-secondary-hover"
          >
            <Icone nome="fechar" tamanho={22} />
          </button>
        </div>

        <div className={CAMPO}>
          <label htmlFor="filtro-categoria" className={ROTULO}>
            Categoria
          </label>
          <div className="relative">
            <select
              id="filtro-categoria"
              value={valorOuVazio(query.categoriaId)}
              onChange={(evento) =>
                onAlterar({ categoriaId: valorOuIndefinido(evento.target.value) })
              }
              disabled={!opcoesCarregadas}
              className={SELECT}
            >
              <option value="">Todas as categorias</option>
              {opcoesCarregadas?.categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
            <SetaSelect />
          </div>
        </div>

        <div className={CAMPO}>
          <label htmlFor="filtro-tecnica" className={ROTULO}>
            Tecnica
          </label>
          <div className="relative">
            <select
              id="filtro-tecnica"
              value={valorOuVazio(query.tecnicaId)}
              onChange={(evento) =>
                onAlterar({ tecnicaId: valorOuIndefinido(evento.target.value) })
              }
              disabled={!opcoesCarregadas}
              className={SELECT}
            >
              <option value="">Todas as tecnicas</option>
              {opcoesCarregadas?.tecnicas.map((tecnica) => (
                <option key={tecnica.id} value={tecnica.id}>
                  {tecnica.nome}
                </option>
              ))}
            </select>
            <SetaSelect />
          </div>
        </div>

        <div className={CAMPO}>
          <label htmlFor="filtro-regiao" className={ROTULO}>
            Regiao
          </label>
          <div className="relative">
            <select
              id="filtro-regiao"
              value={valorOuVazio(query.regiaoId)}
              onChange={(evento) =>
                onAlterar({ regiaoId: valorOuIndefinido(evento.target.value) })
              }
              disabled={!opcoesCarregadas}
              className={SELECT}
            >
              <option value="">Todas as regioes</option>
              {opcoesCarregadas?.regioes.map((regiao) => (
                <option key={regiao.id} value={regiao.id}>
                  {regiao.nome}
                </option>
              ))}
            </select>
            <SetaSelect />
          </div>
        </div>

        <div className={CAMPO}>
          <label htmlFor="filtro-artesao" className={ROTULO}>
            Artesao
          </label>
          <div className="relative">
            <select
              id="filtro-artesao"
              value={valorOuVazio(query.artesaoId)}
              onChange={(evento) =>
                onAlterar({ artesaoId: valorOuIndefinido(evento.target.value) })
              }
              disabled={!artesaosCarregados}
              className={SELECT}
            >
              <option value="">Todos os artesaos</option>
              {artesaosCarregados?.artesaos.map((artesao) => (
                <option key={artesao.id} value={artesao.id}>
                  {artesao.nome}
                </option>
              ))}
            </select>
            <SetaSelect />
          </div>
        </div>

        <button
          type="button"
          onClick={onLimpar}
          disabled={!algumFiltroAtivo}
          className={`${BOTAO_SECUNDARIO} w-full disabled:cursor-not-allowed disabled:border-transparent disabled:bg-action-disabled-bg disabled:text-action-disabled-fg disabled:active:translate-y-0`}
        >
          <Icone nome="fechar" />
          Limpar filtros
        </button>
      </aside>
    </div>
  );
}
