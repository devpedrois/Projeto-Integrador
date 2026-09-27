"use client";

import { useRef, useState } from "react";
import { Alerta } from "@/components/feedback/Alerta";
import {
  BOTAO_REMOVER,
  BOTAO_SECUNDARIO,
  BOTAO_SECUNDARIO_PEQUENO,
} from "@/components/formulario/estilos-botao";
import { Giro } from "@/components/formulario/Giro";
import { BLOCO, IconeVazio } from "@/components/vitrine/EsqueletoProdutos";
import { Icone, type NomeIcone } from "@/components/vitrine/Icone";
import { useModeracao } from "@/hooks/use-moderacao";
import type { ModeracaoService } from "@/services/contracts/moderacao.contract";
import type { Produto } from "@/types/produto";
import type { UsuarioPublico } from "@/types/usuario";
import { normalizarTexto } from "@/utils/normalizar-texto";
import { formatarMoeda } from "@/utils/formatar-moeda";

export interface PainelModeracaoProps {
  service: ModeracaoService;
  adminId: string;
}

type Aba = "artesaos" | "produtos";
type FiltroStatus = "todos" | "ativos" | "inativos";

interface RegistroBase {
  id: string;
  nome: string;
  ativo: boolean;
}

interface RegistroArtesao extends RegistroBase {
  tipo: "artesao";
  email: string;
}

interface RegistroProduto extends RegistroBase {
  tipo: "produto";
  artesao: string;
  preco: number;
  estoque: number;
  aviso?: string;
}

type RegistroModeravel = RegistroArtesao | RegistroProduto;

type Feedback =
  | { tipo: "sucesso"; mensagem: string }
  | { tipo: "erro"; registro: RegistroModeravel };

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: "artesaos", rotulo: "Artesãos" },
  { chave: "produtos", rotulo: "Produtos" },
];

const PLURAIS: Record<Aba, string> = { artesaos: "artesãos", produtos: "produtos" };

const FILTROS: { chave: FiltroStatus; rotulo: string }[] = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "ativos", rotulo: "Ativos" },
  { chave: "inativos", rotulo: "Inativos" },
];

const COLUNAS: Record<Aba, string> = {
  artesaos: "md:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)_112px_128px]",
  produtos: "md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_112px_88px_112px_128px]",
};

const CABECALHOS: Record<Aba, { rotulo: string; direita?: boolean }[]> = {
  artesaos: [
    { rotulo: "Artesão" },
    { rotulo: "E-mail" },
    { rotulo: "Status" },
    { rotulo: "Ação", direita: true },
  ],
  produtos: [
    { rotulo: "Produto" },
    { rotulo: "Artesão" },
    { rotulo: "Preço", direita: true },
    { rotulo: "Estoque", direita: true },
    { rotulo: "Status" },
    { rotulo: "Ação", direita: true },
  ],
};

const LINHA =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border-subtle px-4 py-3.5 md:min-h-[60px] md:gap-4 md:px-6 md:py-2.5";

const AJUSTE_BOTAO_LINHA =
  "min-w-[112px] md:h-[var(--control-h-sm)] md:min-w-[108px] md:px-3.5 md:text-sm";

function chave(registro: RegistroModeravel): string {
  return `${registro.tipo}:${registro.id}`;
}

function verbo(registro: RegistroModeravel): string {
  return registro.ativo ? "desativar" : "ativar";
}

function textoBusca(registro: RegistroModeravel): string {
  return `${registro.nome} ${registro.tipo === "artesao" ? registro.email : registro.artesao}`;
}

function passaNoStatus(registro: RegistroModeravel, status: FiltroStatus): boolean {
  if (status === "todos") return true;
  return status === "ativos" ? registro.ativo : !registro.ativo;
}

export function PainelModeracao({ service, adminId }: PainelModeracaoProps) {
  const { estado, recarregar } = useModeracao(service, adminId);
  const [aba, setAba] = useState<Aba>("artesaos");
  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function trocarAba(nova: Aba) {
    setAba(nova);
    limparFiltros();
  }

  function limparFiltros() {
    setTermo("");
    setStatus("todos");
  }

  function solicitar(registro: RegistroModeravel) {
    setFeedback(null);
    setConfirmando(chave(registro));
  }

  async function confirmar(registro: RegistroModeravel) {
    const ativar = !registro.ativo;
    setProcessando(chave(registro));
    setFeedback(null);
    try {
      if (registro.tipo === "artesao") {
        await (ativar
          ? service.ativarArtesao(registro.id, adminId)
          : service.desativarArtesao(registro.id, adminId));
      } else {
        await (ativar
          ? service.ativarProduto(registro.id, adminId)
          : service.desativarProduto(registro.id, adminId));
      }
      setFeedback({
        tipo: "sucesso",
        mensagem: `${registro.nome} foi ${ativar ? "reativado" : "desativado"}.`,
      });
      recarregar();
    } catch {
      setFeedback({ tipo: "erro", registro });
    } finally {
      setConfirmando(null);
      setProcessando(null);
    }
  }

  if (estado.status === "erro") {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alerta tom="erro">{estado.mensagem}</Alerta>
        <button type="button" onClick={recarregar} className={BOTAO_SECUNDARIO}>
          <Icone nome="recarregar" className="flex-none" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const carregando = estado.status === "carregando";
  const listas: Record<Aba, RegistroModeravel[]> = carregando
    ? { artesaos: [], produtos: [] }
    : montarRegistros(estado.artesaos, estado.produtos);

  const lista = listas[aba];
  const termoNormalizado = normalizarTexto(termo);
  const filtrada = lista.filter(
    (registro) =>
      passaNoStatus(registro, status) &&
      (!termoNormalizado || normalizarTexto(textoBusca(registro)).includes(termoNormalizado))
  );
  const quantidadeAtivos = lista.filter((registro) => registro.ativo).length;
  const contagens: Record<FiltroStatus, number> = {
    todos: lista.length,
    ativos: quantidadeAtivos,
    inativos: lista.length - quantidadeAtivos,
  };
  const erroDaAba =
    feedback?.tipo === "erro" &&
    (feedback.registro.tipo === "artesao" ? "artesaos" : "produtos") === aba
      ? feedback.registro
      : null;

  return (
    <section className="overflow-hidden rounded-card border border-border-subtle bg-surface-card shadow-sm">
      <AbasModeracao
        aba={aba}
        contagens={carregando ? null : { artesaos: listas.artesaos.length, produtos: listas.produtos.length }}
        onTrocar={trocarAba}
      />

      <div
        role="tabpanel"
        id={`painel-${aba}`}
        aria-labelledby={`aba-${aba}`}
        className="flex flex-col"
      >
        <div className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:px-6 md:py-5">
          <div className="relative flex w-full items-center md:w-[380px] md:max-w-full">
            <Icone nome="busca" className="pointer-events-none absolute left-3.5 text-fg-muted" />
            <input
              type="search"
              value={termo}
              onChange={(evento) => setTermo(evento.target.value)}
              disabled={carregando}
              aria-label={aba === "produtos" ? "Buscar por produto ou artesão" : "Buscar por nome ou e-mail"}
              placeholder={aba === "produtos" ? "Buscar por produto ou artesão" : "Buscar por nome ou e-mail"}
              className="h-[var(--control-h-md)] w-full rounded-control border border-border-input bg-surface-card pr-3.5 pl-[42px] text-base text-fg-strong transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out placeholder:text-fg-subtle hover:border-linho-400 focus:border-border-focus focus:shadow-[var(--focus-ring)] focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-70 md:h-[var(--control-h-sm)] md:text-sm"
            />
          </div>
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5 md:gap-2">
            {FILTROS.map((filtro) => (
              <ChipFiltro
                key={filtro.chave}
                rotulo={filtro.rotulo}
                contagem={carregando ? null : contagens[filtro.chave]}
                selecionado={status === filtro.chave}
                desabilitado={carregando}
                onSelecionar={() => setStatus(filtro.chave)}
              />
            ))}
          </div>
        </div>

        {feedback?.tipo === "sucesso" ? (
          <div className="px-4 pb-4 md:px-6 md:pb-5">
            <Alerta tom="sucesso" onFechar={() => setFeedback(null)}>
              {feedback.mensagem}
            </Alerta>
          </div>
        ) : null}

        {erroDaAba ? (
          <div className="px-4 pb-4 md:px-6 md:pb-5">
            <Alerta
              tom="erro"
              titulo={`Não foi possível ${verbo(erroDaAba)} “${erroDaAba.nome}”`}
              onFechar={() => setFeedback(null)}
            >
              <div className="flex flex-col items-start gap-3">
                <p className="m-0">O status continua o mesmo. Verifique sua conexão e tente de novo.</p>
                <button
                  type="button"
                  onClick={() => confirmar(erroDaAba)}
                  disabled={processando !== null}
                  className={BOTAO_SECUNDARIO_PEQUENO}
                >
                  <Icone nome="recarregar" tamanho={16} className="flex-none" />
                  Tentar de novo
                </button>
              </div>
            </Alerta>
          </div>
        ) : null}

        {carregando || filtrada.length > 0 ? (
          <div
            aria-hidden="true"
            className={`hidden h-11 items-center gap-4 border-y border-border-default bg-surface-raised px-6 text-caption font-semibold tracking-[0.06em] text-fg-muted uppercase md:grid ${COLUNAS[aba]}`}
          >
            {CABECALHOS[aba].map((coluna) => (
              <span key={coluna.rotulo} className={coluna.direita ? "text-right" : undefined}>
                {coluna.rotulo}
              </span>
            ))}
          </div>
        ) : null}

        {carregando ? (
          <EsqueletoLinhas />
        ) : lista.length === 0 ? (
          <EstadoVazio
            icone={aba === "produtos" ? "pacoteAberto" : "usuario"}
            titulo={aba === "produtos" ? "Nenhum produto cadastrado" : "Nenhum artesão cadastrado"}
            descricao={
              aba === "produtos"
                ? "Quando os artesãos publicarem peças, elas aparecem aqui."
                : "Quando um artesão criar a conta, ele aparece aqui."
            }
          />
        ) : filtrada.length === 0 ? (
          <EstadoVazio
            icone="busca"
            titulo="Nenhum resultado encontrado"
            descricao="Tente outra palavra ou limpe os filtros."
            onLimpar={limparFiltros}
          />
        ) : (
          <>
            <ul role="list" className="m-0 list-none border-t border-border-default p-0 md:border-t-0">
              {filtrada.map((registro) => (
                <LinhaRegistro
                  key={chave(registro)}
                  registro={registro}
                  colunas={COLUNAS[aba]}
                  confirmando={confirmando === chave(registro)}
                  processando={processando}
                  falhou={erroDaAba !== null && chave(erroDaAba) === chave(registro)}
                  onSolicitar={() => solicitar(registro)}
                  onCancelar={() => setConfirmando(null)}
                  onConfirmar={() => confirmar(registro)}
                />
              ))}
            </ul>
            <p className="m-0 px-4 py-3 text-[13px] text-fg-muted tabular-nums md:px-6 md:py-3.5">
              Mostrando {filtrada.length} de {lista.length} {PLURAIS[aba]}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function montarRegistros(
  artesaos: UsuarioPublico[],
  produtos: Produto[]
): Record<Aba, RegistroModeravel[]> {
  const artesaosPorId = new Map(artesaos.map((artesao) => [artesao.id, artesao]));

  return {
    artesaos: artesaos.map((artesao) => ({
      tipo: "artesao",
      id: artesao.id,
      nome: artesao.nome,
      email: artesao.email,
      ativo: artesao.ativo,
    })),
    produtos: produtos.map((produto) => {
      const artesao = artesaosPorId.get(produto.artesaoId);
      const aviso = !produto.ativo
        ? "Removido pelo artesão: não volta à vitrine pela moderação."
        : artesao && !artesao.ativo
          ? "Oculto da vitrine: artesão desativado."
          : undefined;
      return {
        tipo: "produto",
        id: produto.id,
        nome: produto.nome,
        artesao: artesao?.nome ?? "Artesão desconhecido",
        preco: produto.preco,
        estoque: produto.quantidadeEstoque,
        ativo: produto.desativadoPorAdmin !== true,
        ...(aviso ? { aviso } : {}),
      };
    }),
  };
}

function AbasModeracao({
  aba,
  contagens,
  onTrocar,
}: {
  aba: Aba;
  contagens: Record<Aba, number> | null;
  onTrocar: (aba: Aba) => void;
}) {
  const refs = useRef<Record<Aba, HTMLButtonElement | null>>({ artesaos: null, produtos: null });

  function navegarComTeclado(evento: React.KeyboardEvent) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    evento.preventDefault();
    const proxima: Aba = aba === "artesaos" ? "produtos" : "artesaos";
    onTrocar(proxima);
    refs.current[proxima]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Cadastros para moderação"
      onKeyDown={navegarComTeclado}
      className="flex border-b border-border-default md:gap-8 md:px-6"
    >
      {ABAS.map((item) => {
        const ativa = item.chave === aba;
        return (
          <button
            key={item.chave}
            ref={(elemento) => {
              refs.current[item.chave] = elemento;
            }}
            type="button"
            role="tab"
            id={`aba-${item.chave}`}
            aria-selected={ativa}
            aria-controls={`painel-${item.chave}`}
            tabIndex={ativa ? 0 : -1}
            onClick={() => onTrocar(item.chave)}
            className={`flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-transparent px-0.5 text-[15px] transition-colors duration-[var(--dur-fast)] ease-out md:h-[58px] md:flex-none md:text-base ${
              ativa
                ? "font-semibold text-fg-strong shadow-[inset_0_-2px_0_var(--color-barro-500)]"
                : "font-medium text-fg-muted hover:text-fg-strong"
            }`}
          >
            {item.rotulo}
            {contagens ? (
              <span
                className={`inline-grid h-[22px] min-w-6 place-items-center rounded-pill px-2 text-caption font-semibold tabular-nums ${
                  ativa ? "bg-barro-50 text-barro-700" : "bg-linho-100 text-fg-muted"
                }`}
              >
                {contagens[item.chave]}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ChipFiltro({
  rotulo,
  contagem,
  selecionado,
  desabilitado,
  onSelecionar,
}: {
  rotulo: string;
  contagem: number | null;
  selecionado: boolean;
  desabilitado: boolean;
  onSelecionar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      disabled={desabilitado}
      onClick={onSelecionar}
      className={`inline-flex h-9 items-center gap-1.5 rounded-pill border px-3.5 text-sm font-semibold transition-colors duration-[var(--dur-fast)] ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
        selecionado
          ? "border-barro-500 bg-barro-50 text-barro-700"
          : "border-border-strong bg-surface-card text-fg-body hover:bg-action-secondary-hover"
      }`}
    >
      {rotulo}
      {contagem !== null ? (
        <span className={`tabular-nums ${selecionado ? "text-barro-700" : "text-fg-muted"}`}>
          {contagem}
        </span>
      ) : null}
    </button>
  );
}

function SeloStatus({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex h-[22px] w-fit items-center gap-1.5 rounded-pill px-2 text-caption font-semibold ${
        ativo ? "bg-sucesso-50 text-sucesso-700" : "bg-linho-100 text-fg-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-pill ${ativo ? "bg-sucesso-500" : "bg-linho-400"}`}
      />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

interface LinhaRegistroProps {
  registro: RegistroModeravel;
  colunas: string;
  confirmando: boolean;
  processando: string | null;
  falhou: boolean;
  onSolicitar: () => void;
  onCancelar: () => void;
  onConfirmar: () => void;
}

function LinhaRegistro({
  registro,
  colunas,
  confirmando,
  processando,
  falhou,
  onSolicitar,
  onCancelar,
  onConfirmar,
}: LinhaRegistroProps) {
  const emProcesso = processando === chave(registro);
  const acao = registro.ativo ? "Desativar" : "Ativar";
  const meta =
    registro.tipo === "produto"
      ? `${registro.artesao} · ${formatarMoeda(registro.preco)} · Estoque: ${registro.estoque}`
      : registro.email;

  return (
    <li
      aria-label={registro.nome}
      className={`${LINHA} ${colunas} text-sm ${falhou ? "bg-erro-50" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] leading-[1.3] font-semibold break-words text-fg-strong">
          {registro.nome}
        </span>
        <span className="text-[13px] leading-[1.4] break-words text-fg-muted tabular-nums md:hidden">
          {meta}
        </span>
        <span className="mt-1 md:hidden">
          <SeloStatus ativo={registro.ativo} />
        </span>
        {registro.tipo === "produto" && registro.aviso ? (
          <span className="text-caption font-semibold text-aviso-700">{registro.aviso}</span>
        ) : null}
      </div>

      {registro.tipo === "produto" ? (
        <>
          <span className="hidden break-words text-fg-body md:block">{registro.artesao}</span>
          <span className="hidden text-right font-semibold text-fg-strong tabular-nums md:block">
            {formatarMoeda(registro.preco)}
          </span>
          <span className="hidden text-right tabular-nums md:block">{registro.estoque}</span>
        </>
      ) : (
        <span className="hidden break-words text-fg-body md:block">{registro.email}</span>
      )}

      <span className="hidden md:block">
        <SeloStatus ativo={registro.ativo} />
      </span>

      {confirmando ? (
        <div className="col-span-full flex flex-col gap-3 rounded-md border border-border-default bg-surface-raised p-3.5 md:flex-row md:items-center md:justify-between">
          <p className="m-0 text-body-sm text-fg-body">
            {registro.ativo
              ? "Desativar? Os dados não serão apagados."
              : "Reativar e voltar a exibir na vitrine?"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmar}
              disabled={emProcesso}
              className={registro.ativo ? BOTAO_REMOVER : BOTAO_SECUNDARIO}
            >
              {emProcesso ? <Giro /> : null}
              {emProcesso
                ? "Salvando..."
                : registro.ativo
                  ? "Confirmar desativação"
                  : "Confirmar reativação"}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              disabled={emProcesso}
              className={BOTAO_SECUNDARIO}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <span className="flex justify-end">
          <button
            type="button"
            onClick={onSolicitar}
            disabled={processando !== null}
            aria-label={`${acao} ${registro.nome}`}
            className={`${registro.ativo ? BOTAO_REMOVER : BOTAO_SECUNDARIO} ${AJUSTE_BOTAO_LINHA}`}
          >
            {acao}
          </button>
        </span>
      )}
    </li>
  );
}

function EsqueletoLinhas() {
  return (
    <div role="status" className="border-t border-border-default md:border-t-0">
      <span className="sr-only">Carregando cadastros...</span>
      {Array.from({ length: 6 }, (_, indice) => (
        <div
          key={indice}
          aria-hidden="true"
          className={`${LINHA} md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_112px_128px]`}
        >
          <span className="flex flex-col gap-2">
            <span className={`${BLOCO} h-3.5 w-[70%] md:w-[62%]`} />
            <span className={`${BLOCO} h-3 w-[85%] md:hidden`} />
            <span className={`${BLOCO} h-[22px] w-14 md:hidden`} />
          </span>
          <span className={`${BLOCO} hidden h-3 w-[70%] md:block`} />
          <span className={`${BLOCO} hidden h-[22px] w-16 md:block`} />
          <span className="flex justify-end">
            <span className={`${BLOCO} h-11 w-[112px] rounded-control md:h-9 md:w-[108px]`} />
          </span>
        </div>
      ))}
    </div>
  );
}

function EstadoVazio({
  icone,
  titulo,
  descricao,
  onLimpar,
}: {
  icone: NomeIcone;
  titulo: string;
  descricao: string;
  onLimpar?: () => void;
}) {
  return (
    <div className="px-4 pt-2 pb-5 md:px-6 md:pb-8">
      <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center md:py-12">
        <IconeVazio nome={icone} />
        <h2 className="m-0 font-display text-2xl leading-[1.2] font-semibold text-fg-strong">
          {titulo}
        </h2>
        <p className="m-0 max-w-[380px] text-[15px] leading-[1.55] text-fg-muted">{descricao}</p>
        {onLimpar ? (
          <button type="button" onClick={onLimpar} className={`${BOTAO_SECUNDARIO} mt-1.5`}>
            <Icone nome="fechar" className="flex-none" />
            Limpar filtros
          </button>
        ) : null}
      </div>
    </div>
  );
}
