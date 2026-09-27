"use client";

import { usePerfilPublicoArtesao } from "@/hooks/use-perfil-publico-artesao";
import { RetratoArtesao } from "@/components/artesao/RetratoArtesao";
import { Icone } from "@/components/vitrine/Icone";
import { fotoUrlSegura } from "@/utils/foto-url-segura";
import { formatarMoeda } from "@/utils/formatar-moeda";
import {
  BLOCO,
  CLASSE_ALERTA,
  CLASSE_STATUS,
  CLASSE_VAZIO,
  IconeVazio,
} from "@/components/vitrine/EsqueletoProdutos";
import type { UsuariosService } from "@/services/contracts/usuarios.contract";
import type { ProdutosService } from "@/services/contracts/produtos.contract";
import type { PerfilArtesaoService } from "@/services/contracts/perfil-artesao.contract";
import type { OpcoesFiltroService } from "@/services/contracts/opcoes-filtro.contract";

const CLASSE_FAIXA =
  "mx-auto flex max-w-[var(--container-max)] flex-wrap items-end gap-6 px-4 pt-7 pb-8 sm:gap-12 sm:px-6 sm:pt-14 sm:pb-12";

export interface PerfilArtesaoPublicoProps {
  usuariosService: UsuariosService | null;
  perfilArtesaoService: PerfilArtesaoService | null;
  produtosService: ProdutosService | null;
  opcoesFiltroService: OpcoesFiltroService | null;
  artesaoId: string | null;
}

export function PerfilArtesaoPublico({
  usuariosService,
  perfilArtesaoService,
  produtosService,
  opcoesFiltroService,
  artesaoId,
}: PerfilArtesaoPublicoProps) {
  const { estado, recarregar } = usePerfilPublicoArtesao(
    usuariosService,
    perfilArtesaoService,
    produtosService,
    opcoesFiltroService,
    artesaoId
  );

  if (estado.status === "carregando") {
    return (
      <section className="border-b border-border-default bg-linho-100">
        <div className={CLASSE_FAIXA}>
          <span
            aria-hidden="true"
            className={`${BLOCO} aspect-[4/5] w-[148px] flex-none rounded-[999px_999px_14px_14px] sm:w-[200px] lg:w-[240px]`}
          />
          <div className="flex max-w-[560px] min-w-0 flex-[1_1_320px] flex-col gap-3.5 pb-1">
            <p role="status" className={CLASSE_STATUS}>
              Carregando perfil do artesão...
            </p>
            <span aria-hidden="true" className={`${BLOCO} h-11 w-3/5`} />
            <span aria-hidden="true" className={`${BLOCO} h-4 w-2/5`} />
            <span aria-hidden="true" className={`${BLOCO} mt-2 h-3.5 w-full`} />
            <span aria-hidden="true" className={`${BLOCO} h-3.5 w-11/12`} />
          </div>
        </div>
      </section>
    );
  }

  if (estado.status === "naoEncontrado") {
    return (
      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] pt-8 pb-16 sm:pt-16 sm:pb-24">
        <div className={CLASSE_VAZIO}>
          <IconeVazio nome="usuario" />
          <p role="status" className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
            Artesão não encontrado.
          </p>
        </div>
      </div>
    );
  }

  if (estado.status === "erro") {
    return (
      <div className="mx-auto flex max-w-[var(--container-max)] flex-col items-start gap-3 px-[var(--container-pad)] pt-8 pb-16">
        <p role="alert" className={CLASSE_ALERTA}>
          <Icone nome="alerta" className="mt-0.5 flex-none" />
          {estado.mensagem}
        </p>
        <button
          type="button"
          onClick={recarregar}
          className="inline-flex min-h-[var(--control-h-md)] items-center justify-center rounded-control border border-border-strong bg-surface-card px-4 text-button font-semibold text-fg-strong transition-colors duration-[var(--dur-fast)] ease-out hover:bg-action-secondary-hover"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { usuario, perfil, tecnicaNome, regiaoNome, produtos } = estado;
  const fotoUrl = fotoUrlSegura(perfil?.fotoUrl);

  return (
    <>
      <header className="border-b border-border-default bg-linho-100">
        <div className={CLASSE_FAIXA}>
          <RetratoArtesao key={fotoUrl ?? ""} nome={usuario.nome} fotoUrl={fotoUrl} />
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-[18px] pb-1">
            <h1 className="m-0 font-display text-[36px] leading-[1.05] font-semibold tracking-display break-words text-fg-strong sm:text-[52px]">
              {usuario.nome}
            </h1>
            {tecnicaNome || regiaoNome ? (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-fg-body">
                {tecnicaNome ? (
                  <span className="inline-flex items-center gap-2">
                    <Icone nome="martelo" className="flex-none text-fg-brand" />
                    {tecnicaNome}
                  </span>
                ) : null}
                {regiaoNome ? (
                  <span className="inline-flex items-center gap-2">
                    <Icone nome="pino" className="flex-none text-fg-brand" />
                    {regiaoNome}
                  </span>
                ) : null}
              </div>
            ) : null}
            {perfil?.historia ? (
              <p className="m-0 max-w-[600px] text-base leading-[1.6] break-words whitespace-pre-line text-fg-body sm:text-body-lg">
                {perfil.historia}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[var(--container-max)] px-[var(--container-pad)] pt-8 pb-16 sm:pt-12 sm:pb-20">
        <section aria-label="Produtos do artesão" className="flex flex-col gap-5">
          <h2 className="m-0 font-display text-[24px] leading-[1.2] font-semibold tracking-display text-fg-strong sm:text-[30px]">
            Produtos
          </h2>

          {produtos.length === 0 ? (
            <div className={CLASSE_VAZIO}>
              <IconeVazio nome="pacote" />
              <p role="status" className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
                Nenhum produto disponível no momento.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
              {produtos.map((produto) => {
                const capa = [...produto.fotos].sort((a, b) => a.ordem - b.ordem)[0];
                const capaUrl = fotoUrlSegura(capa?.url);

                return (
                  <li
                    key={produto.id}
                    className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-card p-2.5 transition-[box-shadow,border-color] duration-[var(--dur-base)] ease-out hover:border-border-default hover:shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-16 flex-none place-items-center overflow-hidden rounded-sm bg-linho-100 text-fg-subtle"
                    >
                      {capaUrl ? (
                        <img src={capaUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Icone nome="pacote" tamanho={20} className="opacity-75" />
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="block truncate text-[15px] leading-[1.3] font-semibold text-fg-strong">
                        {produto.nome}
                      </span>
                      <span className="mt-0.5 block text-[15px] font-bold text-fg-strong tabular-nums">
                        {formatarMoeda(produto.preco)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
