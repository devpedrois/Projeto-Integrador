"use client";

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

function valorOuVazio(valor: string | undefined): string {
  return valor ?? "";
}

function valorOuIndefinido(valor: string): string | undefined {
  return valor === "" ? undefined : valor;
}

export function FiltrosProdutos({
  query,
  opcoes,
  artesaos = { status: "carregando" },
  onAlterar,
  onLimpar,
}: FiltrosProdutosProps) {
  const opcoesCarregadas = opcoes.status === "sucesso" ? opcoes : null;
  const artesaosCarregados = artesaos.status === "sucesso" ? artesaos : null;
  const algumFiltroAtivo =
    query.termo !== undefined ||
    query.categoriaId !== undefined ||
    query.tecnicaId !== undefined ||
    query.regiaoId !== undefined ||
    query.artesaoId !== undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="busca-produtos" className="text-sm font-medium">
          Buscar produtos
        </label>
        <input
          id="busca-produtos"
          type="search"
          value={valorOuVazio(query.termo)}
          onChange={(evento) => onAlterar({ termo: valorOuIndefinido(evento.target.value) })}
          className="rounded border border-gray-300 p-2 text-sm"
          placeholder="Nome ou descricao do produto"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-categoria" className="text-sm font-medium">
          Categoria
        </label>
        <select
          id="filtro-categoria"
          value={valorOuVazio(query.categoriaId)}
          onChange={(evento) =>
            onAlterar({ categoriaId: valorOuIndefinido(evento.target.value) })
          }
          disabled={!opcoesCarregadas}
          className="rounded border border-gray-300 p-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {opcoesCarregadas?.categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-tecnica" className="text-sm font-medium">
          Tecnica
        </label>
        <select
          id="filtro-tecnica"
          value={valorOuVazio(query.tecnicaId)}
          onChange={(evento) =>
            onAlterar({ tecnicaId: valorOuIndefinido(evento.target.value) })
          }
          disabled={!opcoesCarregadas}
          className="rounded border border-gray-300 p-2 text-sm"
        >
          <option value="">Todas as tecnicas</option>
          {opcoesCarregadas?.tecnicas.map((tecnica) => (
            <option key={tecnica.id} value={tecnica.id}>
              {tecnica.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-regiao" className="text-sm font-medium">
          Regiao
        </label>
        <select
          id="filtro-regiao"
          value={valorOuVazio(query.regiaoId)}
          onChange={(evento) =>
            onAlterar({ regiaoId: valorOuIndefinido(evento.target.value) })
          }
          disabled={!opcoesCarregadas}
          className="rounded border border-gray-300 p-2 text-sm"
        >
          <option value="">Todas as regioes</option>
          {opcoesCarregadas?.regioes.map((regiao) => (
            <option key={regiao.id} value={regiao.id}>
              {regiao.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-artesao" className="text-sm font-medium">
          Artesao
        </label>
        <select
          id="filtro-artesao"
          value={valorOuVazio(query.artesaoId)}
          onChange={(evento) =>
            onAlterar({ artesaoId: valorOuIndefinido(evento.target.value) })
          }
          disabled={!artesaosCarregados}
          className="rounded border border-gray-300 p-2 text-sm"
        >
          <option value="">Todos os artesaos</option>
          {artesaosCarregados?.artesaos.map((artesao) => (
            <option key={artesao.id} value={artesao.id}>
              {artesao.nome}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onLimpar}
        disabled={!algumFiltroAtivo}
        className="rounded border border-gray-300 p-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Limpar filtros
      </button>
    </div>
  );
}
