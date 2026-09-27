"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDetalheProduto } from "@/hooks/use-detalhe-produto";
import { useNomeArtesao } from "@/hooks/use-nome-artesao";
import { FaixaRecomendacoes } from "@/components/vitrine/FaixaRecomendacoes";
import { Icone } from "@/components/vitrine/Icone";
import {
  BLOCO,
  CLASSE_ALERTA,
  CLASSE_STATUS,
  CLASSE_VAZIO,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { formatarMoeda } from "@/utils/formatar-moeda";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { AvaliacoesService } from "@/services/contracts/avaliacoes.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { RecomendacoesService } from "@/services/contracts/recomendacoes.contract";
import type { Produto } from "@/types/produto";
import type { ResumoAvaliacoes } from "@/types/avaliacao";
import type { RecomendacaoContexto } from "@/types/recomendacao";

export interface DetalheProdutoProps {
  produtoId: string | null;
  produtosService: ProdutosService | null;
  avaliacoesService: AvaliacoesService | null;
  opcoesFiltroService: OpcoesFiltroService | null;
  usuariosService: UsuariosService | null;
  recomendacoesService: RecomendacoesService | null;
  onAdicionarAoCarrinho(produto: Produto): void;
  erroCarrinho?: string;
  mensagemCarrinho?: string;
}

const ERRO_CARRINHO_ID = "erro-carrinho-detalhe";

const CLASSE_DT = "border-b border-border-subtle py-3.5 pr-6 text-body-sm text-fg-muted";
const CLASSE_DD = "m-0 border-b border-border-subtle py-3.5 text-[15px] text-fg-strong";

const BOTAO_SECUNDARIO =
  "inline-flex min-h-[var(--control-h-md)] items-center justify-center rounded-control border border-border-strong bg-surface-card px-4 text-button font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover";

function iniciais(nome: string | null | undefined): string {
  if (!nome) return "";
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function textoEstoque(quantidade: number): string {
  return quantidade === 1 ? "1 disponivel" : `${quantidade} disponiveis`;
}

function textoAvaliacoes({ media, quantidade }: ResumoAvaliacoes): string {
  if (quantidade === 0) return "Sem avaliacoes ainda";
  const rotulo = quantidade === 1 ? "1 avaliacao" : `${quantidade} avaliacoes`;
  return `Nota ${media.toFixed(1)} de 5 (${rotulo})`;
}

export function DetalheProduto({
  produtoId,
  produtosService,
  avaliacoesService,
  opcoesFiltroService,
  usuariosService,
  recomendacoesService,
  onAdicionarAoCarrinho,
  erroCarrinho,
  mensagemCarrinho,
}: DetalheProdutoProps) {
  const { estado, recarregar } = useDetalheProduto(
    produtosService,
    avaliacoesService,
    opcoesFiltroService,
    produtoId
  );
  const produto = estado.status === "sucesso" ? estado.produto : null;
  const nomeArtesao = useNomeArtesao(
    produto ? usuariosService : null,
    produto?.artesaoId ?? ""
  );

  const contextoRecomendacao = useMemo<RecomendacaoContexto | null>(
    () => (produto ? { produtoId: produto.id } : null),
    [produto]
  );

  const fotos = useMemo(
    () =>
      produto
        ? [...produto.fotos]
            .sort((a, b) => a.ordem - b.ordem)
            .map((foto) => fotoUrlSegura(foto.url))
            .filter((url): url is string => url !== null)
        : [],
    [produto]
  );

  const semEstoque = produto?.quantidadeEstoque === 0;

  return (
    <div className="mx-auto w-full max-w-[var(--container-max)] px-[var(--container-pad)] pb-20">
      <div className="pt-4 pb-4 sm:pt-7 sm:pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[15px] font-semibold text-fg-link no-underline hover:text-fg-link-hover"
        >
          <Icone nome="voltar" />
          Voltar para a vitrine
        </Link>
      </div>

      {estado.status === "carregando" ? (
        <div className="flex flex-col gap-4">
          <p role="status" className={CLASSE_STATUS}>
            Carregando produto...
          </p>
          <div aria-hidden="true" className="flex flex-wrap items-start gap-6 sm:gap-12">
            <span className={`${BLOCO} aspect-square min-w-0 flex-[1.1_1_400px] rounded-card`} />
            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 pt-2">
              <span className={`${BLOCO} h-10 w-4/5`} />
              <span className={`${BLOCO} h-4 w-[45%]`} />
              <span className={`${BLOCO} h-8 w-[30%]`} />
              <span className={`${BLOCO} h-3.5 w-full`} />
              <span className={`${BLOCO} h-3.5 w-11/12`} />
              <span className={`${BLOCO} h-44 rounded-card`} />
              <span className={`${BLOCO} h-[var(--control-h-lg)] rounded-control`} />
            </div>
          </div>
        </div>
      ) : null}

      {estado.status === "indisponivel" ? (
        <div className={CLASSE_VAZIO}>
          <IconeVazio nome="pacote" />
          <p role="status" className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
            Produto indisponivel ou nao encontrado.
          </p>
        </div>
      ) : null}

      {estado.status === "erro" ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className={CLASSE_ALERTA}>
            <Icone nome="alerta" className="mt-0.5 flex-none" />
            {estado.mensagem}
          </p>
          <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
            Tentar novamente
          </button>
        </div>
      ) : null}

      {estado.status === "sucesso" && produto ? (
        <>
          <article className="flex flex-wrap items-start gap-6 sm:gap-12">
            <div className="min-w-0 flex-[1.1_1_400px] lg:sticky lg:top-24">
              {fotos.length > 0 ? (
                <ul aria-label="Fotos do produto" className="grid grid-cols-4 gap-2 sm:gap-3">
                  {fotos.map((url, indice) => (
                    <li key={`${url}-${indice}`} className={indice === 0 ? "col-span-4" : undefined}>
                      <img
                        src={url}
                        alt={`${produto.nome}, foto ${indice + 1}`}
                        className={`aspect-square w-full border border-border-subtle bg-linho-100 object-cover ${
                          indice === 0 ? "rounded-card shadow-card" : "rounded-media"
                        }`}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <div
                  aria-hidden="true"
                  className="grid aspect-square place-items-center rounded-card bg-linho-100 text-fg-subtle"
                >
                  <Icone nome="pacote" tamanho={48} className="opacity-75" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h1 className="m-0 font-display text-[30px] leading-[1.1] font-semibold tracking-display break-words text-balance text-fg-strong sm:text-[40px]">
                  {produto.nome}
                </h1>

                <p className="m-0 flex items-center gap-2 text-[15px] text-fg-muted">
                  <Icone
                    nome="estrela"
                    className={
                      estado.resumo.quantidade > 0
                        ? "flex-none fill-aviso-500 text-aviso-500"
                        : "flex-none text-linho-400"
                    }
                  />
                  {textoAvaliacoes(estado.resumo)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-border-default py-[18px]">
                <p className="m-0 text-[32px] leading-none font-bold tracking-tight text-fg-strong tabular-nums">
                  {formatarMoeda(produto.preco)}
                </p>

                <p
                  className={`m-0 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
                    semEstoque ? "bg-linho-100 text-fg-muted" : "bg-aviso-50 text-aviso-700"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-pill ${semEstoque ? "bg-linho-400" : "bg-aviso-500"}`}
                  />
                  Estoque: {textoEstoque(produto.quantidadeEstoque)}
                </p>
              </div>

              <p className="m-0 max-w-[520px] text-[17px] leading-[1.6] break-words whitespace-pre-line text-fg-body">
                {produto.descricao}
              </p>

              <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] rounded-card border border-border-subtle bg-surface-card px-5 py-1 shadow-card [&>dd:last-of-type]:border-b-0 [&>dt:last-of-type]:border-b-0">
                {estado.categoriaNome ? (
                  <>
                    <dt className={CLASSE_DT}>Categoria</dt>
                    <dd className={`${CLASSE_DD} py-3`}>
                      <span className="inline-flex rounded-pill bg-barro-50 px-2.5 py-1 text-body-sm font-semibold text-barro-700">
                        {estado.categoriaNome}
                      </span>
                    </dd>
                  </>
                ) : null}
                {estado.tecnicaNome ? (
                  <>
                    <dt className={CLASSE_DT}>Tecnica</dt>
                    <dd className={CLASSE_DD}>{estado.tecnicaNome}</dd>
                  </>
                ) : null}
                {estado.regiaoNome ? (
                  <>
                    <dt className={CLASSE_DT}>Regiao</dt>
                    <dd className={CLASSE_DD}>{estado.regiaoNome}</dd>
                  </>
                ) : null}
                <dt className={`${CLASSE_DT} flex items-center`}>Artesao</dt>
                <dd className={`${CLASSE_DD} flex items-center gap-3 py-3`}>
                  {nomeArtesao ? (
                    <span
                      aria-hidden="true"
                      className="grid h-[42px] w-9 flex-none place-items-center rounded-[999px_999px_10px_10px] bg-barro-100 text-[13px] font-bold text-barro-800"
                    >
                      {iniciais(nomeArtesao)}
                    </span>
                  ) : null}
                  <Link
                    href={`/artesao/${produto.artesaoId}`}
                    className="text-[15px] font-semibold text-fg-link hover:text-fg-link-hover"
                  >
                    {nomeArtesao ?? "Ver perfil do artesao"}
                  </Link>
                </dd>
              </dl>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onAdicionarAoCarrinho(produto)}
                  aria-describedby={erroCarrinho ? ERRO_CARRINHO_ID : undefined}
                  className="inline-flex min-h-[var(--control-h-lg)] w-full items-center justify-center gap-2 rounded-control bg-action-primary px-6 text-base font-semibold text-fg-on-brand transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-primary-hover active:translate-y-px active:bg-action-primary-press lg:w-auto lg:min-w-[280px] lg:self-start"
                >
                  <Icone nome="sacola" tamanho={20} className="flex-none" />
                  Adicionar ao carrinho
                </button>

                {erroCarrinho ? (
                  <p
                    id={ERRO_CARRINHO_ID}
                    role="alert"
                    className="m-0 flex items-start gap-1.5 text-body-sm text-erro-700"
                  >
                    <Icone nome="alerta" tamanho={16} className="mt-0.5 flex-none" />
                    {erroCarrinho}
                  </p>
                ) : null}

                {mensagemCarrinho && !erroCarrinho ? (
                  <p role="status" className="m-0 text-body-sm font-medium text-sucesso-700">
                    {mensagemCarrinho}
                  </p>
                ) : null}
              </div>
            </div>
          </article>

          <FaixaRecomendacoes service={recomendacoesService} contexto={contextoRecomendacao} />
        </>
      ) : null}
    </div>
  );
}
